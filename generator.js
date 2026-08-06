const db = require('./db.js');

const query = (sql, args = []) => new Promise((resolve, reject) => {
    db.query(sql, args, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
    });
});

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MAX_PERIODS = 6;

// Helper: Shuffle array for randomness
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

async function generateTimetable(deptId, semType) {
    if (!deptId) deptId = 1;
    if (!semType) semType = 'odd';

    // Support either 'odd'/'even', a comma separated list '1,3,5', or exact semester number
    let semesters = [1, 3, 5, 7];
    if (semType === 'even') semesters = [2, 4, 6, 8];
    else if (semType === 'odd') semesters = [1, 3, 5, 7];
    else if (semType === 'all') semesters = [1, 2, 3, 4, 5, 6, 7, 8];
    else if (typeof semType === 'string' && semType.includes(',')) {
        semesters = semType.split(',').map(s => parseInt(s.trim()));
    } else if (!isNaN(parseInt(semType))) {
        semesters = [parseInt(semType)];
    }

    // 1. Clean up old timetables for this generation pass.
    if (semType === 'odd' || semType === 'even' || semType === 'all') {
        // As requested: Selecting Odd resets Even, and Selecting Even resets Odd.
        await query("DELETE FROM timetable WHERE dept_id = ?", [deptId]);
    } else {
        await query("DELETE FROM timetable WHERE dept_id = ? AND sem IN (?)", [deptId, semesters]);
    }

    // 2. Fetch Base Entities
    const classes = await query("SELECT * FROM classes WHERE dept_id = ? AND sem IN (?)", [deptId, semesters]);
    if (classes.length === 0) return true; // Nothing to generate

    const classrooms = await query("SELECT * FROM classrooms ORDER BY capacity DESC");
    const allTeachers = await query("SELECT * FROM teachers WHERE dept_id = ?", [deptId]);
    if (allTeachers.length === 0) throw new Error("No teachers available in this department.");

    const teacherSubjectsRaw = await query("SELECT * FROM teacher_subjects");
    let teacherMap = {}; // subject_id -> array of teacher_id
    for (let ts of teacherSubjectsRaw) {
        if (!teacherMap[ts.subject_id]) teacherMap[ts.subject_id] = [];
        teacherMap[ts.subject_id].push(ts.teacher_id);
    }

    // Track how many hours have already been assigned per subject during this generation
    let subjectAssignedHours = {};

    let classIds = classes.map(c => c.id);
    if (classIds.length === 0) classIds = [0];
    const lockedSlotsRaw = await query("SELECT * FROM locked_slots WHERE class_id IN (?)", [classIds]);

    // Track absent teachers for today 
    let absentTeacherIds = [];
    try {
        const absentTeachersRaw = await query("SELECT teacher_id FROM teacher_availability WHERE available = 0 AND date = CURDATE()");
        absentTeacherIds = absentTeachersRaw.map(r => r.teacher_id);
    } catch (e) { }

    // State Tracking
    let classSchedule = {};     // { classId: { day_period: true } }
    let teacherSchedule = {};   // { teacherId: { day_period: true } }
    let roomSchedule = {};      // { roomId: { day_period: true } }
    let teacherHours = {};      // { teacherId: int } -> to prioritize

    allTeachers.forEach(t => teacherHours[t.id] = 0);

    function isFree(scheduleMap, id, day, period) {
        if (!scheduleMap[id]) return true;
        return !scheduleMap[id][`${day}_${period}`];
    }
    function book(scheduleMap, id, day, period) {
        if (!scheduleMap[id]) scheduleMap[id] = {};
        scheduleMap[id][`${day}_${period}`] = true;
    }

    let valuesToInsert = [];

    // 3. Pre-Assignment Phase (Lock Fixed Slots)
    // We create dummy subjects for locked slots if they don't exist
    // BUT skip lab slots! Lab slots are reserved spaces, not events in themselves.
    let regularLockedSlots = lockedSlotsRaw.filter(l => !l.is_lab_slot);
    let labLockedSlots = lockedSlotsRaw.filter(l => l.is_lab_slot);

    for (const lock of regularLockedSlots) {
        let dummySubject = await query("SELECT id FROM subjects WHERE name = ? LIMIT 1", [lock.event_name]);
        let subjectId;
        if (dummySubject.length > 0) {
            subjectId = dummySubject[0].id;
        } else {
            const insertSub = await query("INSERT INTO subjects (name, dept_id, sem, hours_required) VALUES (?, ?, ?, 0)", [lock.event_name, deptId, 1]);
            subjectId = insertSub.insertId;
        }

        let clss = classes.find(c => c.id === lock.class_id);

        book(classSchedule, lock.class_id, lock.day, lock.period);

        valuesToInsert.push([
            lock.class_id, deptId, clss.sem, lock.day, lock.period, subjectId, null, null, 'draft'
        ]);
    }

    // 4. Main Generation per Class
    for (const currentClass of classes) {
        let subjects = await query("SELECT * FROM subjects WHERE dept_id = ? AND sem = ?", [deptId, currentClass.sem]);

        // Calculate hours Needed for each subject before sorting
        subjects.forEach(sub => {
            const completedHrs = sub.completed_hours || 0;
            sub.hoursNeeded = Math.max(0, sub.hours_required - completedHrs);
        });

        // CRITICAL: Schedule Labs first because they require contiguous blocks and specific locked slots.
        // Secondary priority: Subjects with MORE remaining hours needed get placed before subjects with fewer.
        subjects.sort((a, b) => {
            if (b.is_lab !== a.is_lab) return b.is_lab - a.is_lab;
            return b.hoursNeeded - a.hoursNeeded;
        });

        for (let sub of subjects) {
            if (sub.hours_required === 0) continue; // Dummy subjects

            // CHECK: Skip subjects whose hours are already completed
            if (sub.hoursNeeded <= 0) continue;
            let hoursNeeded = sub.hoursNeeded;

            // Initialize tracking for this subject
            if (!subjectAssignedHours[sub.id]) subjectAssignedHours[sub.id] = 0;

            // Determine chunks of periods to schedule
            let chunks = [];
            if (sub.is_lab) {
                // Labs are scheduled in continuous chunks, typically 2 or 3 hours.
                if (hoursNeeded === 6) chunks = [3, 3];
                else if (hoursNeeded === 4) chunks = [2, 2];
                else if (hoursNeeded >= 2) chunks = [hoursNeeded];
                else chunks = [1];
            } else {
                // Theory: chunks of 1 hour
                for (let i = 0; i < hoursNeeded; i++) chunks.push(1);
            }

            for (let chunkSize of chunks) {
                let placed = false;
                let attempts = 0;

                // Create a randomized search space for day/period
                let searchSpace = [];
                for (let d = 0; d < DAYS.length; d++) {
                    for (let p = 1; p <= MAX_PERIODS; p++) searchSpace.push({ day: DAYS[d], period: p });
                }

                // Filter search space based on is_lab
                let classLabSlots = labLockedSlots.filter(l => l.class_id === currentClass.id);
                if (sub.is_lab) {
                    // Only keep slots that exist in classLabSlots
                    searchSpace = searchSpace.filter(slot =>
                        classLabSlots.some(l => l.day === slot.day && l.period === slot.period)
                    );
                } else {
                    // Exclude lab slots for theory
                    searchSpace = searchSpace.filter(slot =>
                        !classLabSlots.some(l => l.day === slot.day && l.period === slot.period)
                    );
                }
                searchSpace = shuffle(searchSpace);

                // Group searchSpace by day, find all valid contiguous starting periods
                let possibleStarts = [];
                for (let d of DAYS) {
                    let freeInDay = searchSpace.filter(s => s.day === d).sort((a, b) => a.period - b.period);
                    for (let i = 0; i <= freeInDay.length - chunkSize; i++) {
                        let isContiguous = true;
                        // Ensure chronological string of valid periods
                        for (let j = 0; j < chunkSize - 1; j++) {
                            if (freeInDay[i + j].period + 1 !== freeInDay[i + j + 1].period) {
                                isContiguous = false;
                                break;
                            }
                        }
                        if (isContiguous) {
                            possibleStarts.push(freeInDay[i]);
                        }
                    }
                }

                possibleStarts = shuffle(possibleStarts);

                for (let startSlot of possibleStarts) {
                    let day = startSlot.day;
                    let startP = startSlot.period;

                    // Check teacher assignments and availability for the ENTIRE block duration
                    let allowedTeacherIds = teacherMap[sub.id] || [];

                    let availableTeachers = allTeachers
                        .filter(t => allowedTeacherIds.includes(t.id) && !absentTeacherIds.includes(t.id))
                        .filter(t => {
                            for (let step = 0; step < chunkSize; step++) {
                                if (!isFree(teacherSchedule, t.id, day, startP + step)) return false;
                            }
                            return true;
                        })
                        .sort((a, b) => teacherHours[a.id] - teacherHours[b.id]);

                    if (availableTeachers.length === 0) continue;
                    let chosenTeacher = availableTeachers[0];

                    // Check if class schedule is available for the ENTIRE block duration
                    let classIsFree = true;
                    for (let step = 0; step < chunkSize; step++) {
                        if (!isFree(classSchedule, currentClass.id, day, startP + step)) {
                            classIsFree = false;
                            break;
                        }
                    }
                    if (!classIsFree) continue;

                    // Find compliant rooms (is_lab if explicitly required, else default_classroom)
                    let validRooms = [];
                    if (sub.is_lab) {
                        validRooms = classrooms.filter(r => r.is_lab === 1 && r.capacity >= currentClass.strength);
                    } else {
                        let defaultRoom = classrooms.find(r => r.id === currentClass.default_classroom_id);
                        if (defaultRoom) validRooms.push(defaultRoom);
                    }

                    // Filter candidate rooms validating them against the ENTIRE block duration requirements
                    validRooms = validRooms.filter(r => {
                        for (let step = 0; step < chunkSize; step++) {
                            if (!isFree(roomSchedule, r.id, day, startP + step)) return false;
                        }
                        return true;
                    });

                    if (validRooms.length === 0) {
                        // console.log(`No valid rooms for ${sub.name}, day ${day} start ${startP}. Candidates:`, classrooms.filter(r => r.is_lab === 1 && r.capacity >= currentClass.strength));
                        continue;
                    }
                    let chosenRoom = validRooms[0];

                    // Validation passed - Lock block synchronously into scheduling objects
                    for (let step = 0; step < chunkSize; step++) {
                        let p = startP + step;
                        book(classSchedule, currentClass.id, day, p);
                        book(teacherSchedule, chosenTeacher.id, day, p);
                        book(roomSchedule, chosenRoom.id, day, p);
                        valuesToInsert.push([
                            currentClass.id, deptId, currentClass.sem, day, p, sub.id, chosenTeacher.id, chosenRoom.id, 'draft'
                        ]);
                    }
                    teacherHours[chosenTeacher.id] += chunkSize;
                    subjectAssignedHours[sub.id] += chunkSize;
                    placed = true;
                    break; // Exit search blocks successfully
                }

                if (!placed) {
                    // console.log(`Warning: Could not place contiguous block of ${chunkSize} for ${sub.name} for class ${currentClass.name}`);
                }
            }
        }
    }

    // 5. Commit to DB
    if (valuesToInsert.length > 0) {
        await query(`
        INSERT INTO timetable
        (class_id, dept_id, sem, day, period, subject_id, teacher_id, classroom_id, status)
        VALUES ?
      `, [valuesToInsert]);
    }

    return true;
}

module.exports = generateTimetable;
