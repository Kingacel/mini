const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json()); // for JSON
app.use(express.urlencoded({ extended: true })); // ⭐ REQUIRED for FormData
app.use(express.static("public"));


// ================= LOGIN =================
app.post("/teacherlogin", (req, res) => {
  const { email, password } = req.body;

  // CHECK ADMIN
  db.query(
    "SELECT id FROM admins WHERE email=? AND password=?",
    [email, password],
    (err, adminResult) => {
      if (err) return res.json({ success: false });

      if (adminResult.length > 0) {
        return res.json({ success: true, isAdmin: true });
      }

      // CHECK TEACHER
      db.query(
        "SELECT id FROM teacherlogin WHERE email=? AND password=?",
        [email, password],
        (err, teacherResult) => {
          if (err) return res.json({ success: false });

          if (teacherResult.length > 0) {
            res.json({ success: true, isAdmin: false });
          } else {
            res.json({ success: false, message: "Wrong email or password" });
          }
        }
      );
    }
  );
});


// ================= TEACHERS CRUD =================
app.get("/teachers", (req, res) => {
  db.query("SELECT * FROM teachers", (err, result) => {
    res.json(result);
  });
});

app.post("/teacher", (req, res) => {
  const { name, dept, email } = req.body;

  db.query(
    "INSERT INTO teachers(name,dept,email) VALUES(?,?,?)",
    [name, dept, email],
    () => res.json({ success: true })
  );
});

app.put("/teacher/:id", (req, res) => {
  const { name, dept, email } = req.body;

  db.query(
    "UPDATE teachers SET name=?,dept=?,email=? WHERE id=?",
    [name, dept, email, req.params.id],
    () => res.json({ success: true })
  );
});

app.delete("/teacher/:id", (req, res) => {
  db.query(
    "DELETE FROM teachers WHERE id=?",
    [req.params.id],
    () => res.json({ success: true })
  );
});


// ================= SUBJECTS CRUD =================
app.get("/subjects", (req, res) => {
  db.query("SELECT * FROM subjects", (err, result) => {
    res.json(result);
  });
});

// ADD SUBJECT
app.post("/subject", (req, res) => {
  const { name, dept, sem, hours } = req.body;
  const lab = req.body.lab ? 1 : 0;

  db.query(
    "INSERT INTO subjects(name,dept,sem,hours,lab) VALUES(?,?,?,?,?)",
    [name, dept, sem, hours, lab],
    () => res.json({ success: true })
  );
});

// UPDATE SUBJECT
app.put("/subject/:id", (req, res) => {
  const { name, dept, sem, hours } = req.body;
  const lab = req.body.lab ? 1 : 0;

  db.query(
    "UPDATE subjects SET name=?,dept=?,sem=?,hours=?,lab=? WHERE id=?",
    [name, dept, sem, hours, lab, req.params.id],
    () => res.json({ success: true })
  );
});

// DELETE SUBJECT
app.delete("/subject/:id", (req, res) => {
  db.query(
    "DELETE FROM subjects WHERE id=?",
    [req.params.id],
    () => res.json({ success: true })
  );
});


// ================= DASHBOARD STATS =================
app.get("/stats/subjects", (req, res) => {
  db.query(
    "SELECT COUNT(*) AS total FROM subjects",
    (err, result) => {
      if (err) return res.json({ total: 0 });
      res.json({ total: result[0].total });
    }
  );
});


// ================= TIMETABLE =================
app.post("/generate", (req, res) => {
  db.query("DELETE FROM timetable");

  db.query("SELECT * FROM subjects", (err, subjects) => {
    if (err) return res.json({ success: false });

    let days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    let period = 1;

    subjects.forEach((s, i) => {
      db.query(
        "INSERT INTO timetable(day,period,subject) VALUES(?,?,?)",
        [days[i % 5], period++, s.name]
      );
    });

    res.json({ message: "Timetable Generated Successfully" });
  });
});

app.get("/timetable", (req, res) => {
  db.query("SELECT * FROM timetable", (err, result) => {
    res.json(result);
  });
});


// ================= SERVER =================
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
