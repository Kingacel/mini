const db = require('./db.js');

async function test() {
    db.query("SELECT s.id, s.name, (SELECT COUNT(*) FROM teacher_subjects ts WHERE ts.subject_id = s.id) as teacher_count FROM subjects s WHERE s.sem IN (1,3,5,7)", (err, results) => {
        if (err) throw err;
        let missing = results.filter(r => r.teacher_count === 0);
        console.log(`Missing teacher mapping for ${missing.length} subjects.`);
        console.log(missing.map(m => `Subject ${m.id}: ${m.name}`).join('\n'));
        db.end();
    });
}
test();
