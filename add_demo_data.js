const fs = require('fs');
const mysql = require('mysql2/promise');

async function run() {
    const db = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Prem562390!",
        database: "college_timetable_me",
        multipleStatements: true
    });

    const sql = `
-- SEM 6
INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id)
SELECT t.id, s.id
FROM teachers t, subjects s
WHERE 
(t.name = 'Dr. Alan' AND s.code = 'CST302') OR
(t.name = 'Dr. Bob' AND s.code = 'CST304') OR
(t.name = 'Dr. Carol' AND s.code = 'CST306') OR
(t.name = 'Dr. David' AND s.code = 'HUT300') OR
(t.name = 'Dr. Eva' AND s.code = 'CST308') OR
(t.name = 'Dr. Frank' AND s.code = 'CSL332') OR
(t.name = 'Dr. Alan' AND s.code = 'CSD334');

-- SEM 7
INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id)
SELECT t.id, s.id
FROM teachers t, subjects s
WHERE 
(t.name = 'Dr. Bob' AND s.code = 'CST401') OR
(t.name = 'Dr. Carol' AND s.code = 'CST403') OR
(t.name = 'Dr. David' AND s.code = 'CST405') OR
(t.name = 'Dr. Eva' AND s.code = 'CST407') OR
(t.name = 'Dr. Frank' AND s.code = 'CSL401') OR
(t.name = 'Dr. Alan' AND s.code = 'CSD403');

-- SEM 8
INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id)
SELECT t.id, s.id
FROM teachers t, subjects s
WHERE 
(t.name = 'Dr. Bob' AND s.code = 'CST499') OR
(t.name = 'Dr. Carol' AND s.code = 'CST481');

-- LOCKED SLOTS for S6, S7
INSERT IGNORE INTO locked_slots (class_id, day, period, event_name, is_lab_slot) VALUES
(6, 'Wednesday', 4, 'Networking Lab', 1),
(6, 'Wednesday', 5, 'Networking Lab', 1),
(6, 'Wednesday', 6, 'Networking Lab', 1),
(7, 'Thursday', 4, 'Machine Learning Lab', 1),
(7, 'Thursday', 5, 'Machine Learning Lab', 1),
(7, 'Thursday', 6, 'Machine Learning Lab', 1);
    `;

    await db.query(sql);
    console.log("Demo configuration added successfully.");
    db.end();
}

run().catch(console.error);
