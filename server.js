const express = require("express");
const pool = require("./db");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const periods = 6;

// Generate timetable
app.post("/generate", async (req, res) => {

  await pool.query("DELETE FROM timetable"); // clear old timetable

  const [subjects] = await pool.query("SELECT * FROM subjects");

  for (let day of days) {
    for (let p = 1; p <= periods; p++) {

      for (let subject of subjects) {
        try {
          await pool.query(
            "INSERT INTO timetable (day, period, subject_id, teacher_id) VALUES (?, ?, ?, ?)",
            [day, p, subject.id, subject.teacher_id]
          );
          break;
        } catch (err) {
          continue; // teacher clash -> try next subject
        }
      }

    }
  }

  res.json({ message: "Timetable Generated Successfully" });
});

// View timetable
app.get("/view", async (req, res) => {
  const [rows] = await pool.query(`
    SELECT timetable.day, timetable.period, subjects.name AS subject
    FROM timetable
    JOIN subjects ON timetable.subject_id = subjects.id
    ORDER BY day, period
  `);

  res.json(rows);
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
