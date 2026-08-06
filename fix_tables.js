const db = require('./db.js');

const sqls = [
    'CREATE TABLE IF NOT EXISTS classrooms (id INT AUTO_INCREMENT PRIMARY KEY, room_no VARCHAR(20) UNIQUE, capacity INT)',
    'CREATE TABLE IF NOT EXISTS classes (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50), dept_id INT, sem INT, student_strength INT, FOREIGN KEY (dept_id) REFERENCES departments(id))',
    'CREATE TABLE IF NOT EXISTS batches (id INT AUTO_INCREMENT PRIMARY KEY, class_id INT, name VARCHAR(50), FOREIGN KEY (class_id) REFERENCES classes(id))',
    'CREATE TABLE IF NOT EXISTS locked_slots (id INT AUTO_INCREMENT PRIMARY KEY, class_id INT, event_name VARCHAR(100), day VARCHAR(10), period INT, FOREIGN KEY (class_id) REFERENCES classes(id))',
    'CREATE TABLE IF NOT EXISTS teacher_subjects (id INT AUTO_INCREMENT PRIMARY KEY, teacher_id INT, subject_id INT, FOREIGN KEY (teacher_id) REFERENCES teachers(id), FOREIGN KEY (subject_id) REFERENCES subjects(id))',
    'CREATE TABLE IF NOT EXISTS teacher_availability (id INT AUTO_INCREMENT PRIMARY KEY, teacher_id INT, date DATE, available BOOLEAN, FOREIGN KEY (teacher_id) REFERENCES teachers(id))',
    'ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code VARCHAR(50)',
    'ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_lab BOOLEAN DEFAULT 0',
    'ALTER TABLE timetable ADD COLUMN IF NOT EXISTS classroom_id INT',
    'ALTER TABLE timetable ADD COLUMN IF NOT EXISTS class_id INT',
    'ALTER TABLE timetable ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT "active"'
];

let i = 0;
function next() {
    if (i >= sqls.length) {
        console.log('Tables fixed');
        process.exit(0);
    }
    db.query(sqls[i], (err) => {
        if (err) {
            if (!err.message.includes('Duplicate column') && !err.message.includes('syntax')) {
                console.error(err);
            }
        }
        i++;
        next();
    });
}

next();
