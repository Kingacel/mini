const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.static("public"));


// ================= LOGIN =================

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // 1️⃣ Check ADMIN
    const adminSql = "SELECT id FROM admins WHERE email=? AND password=?";
    db.query(adminSql, [email, password], (err, adminResult) => {
        if (err) return res.status(500).json(err);

        if (adminResult.length > 0) {
            return res.json({
                success: true,
                role: "admin",
                id: adminResult[0].id
            });
        }

        // 2️⃣ Check TEACHER
        const teacherSql =
          "SELECT id, dept_id FROM teachers WHERE email=? AND password=?";
        db.query(teacherSql, [email, password], (err, teacherResult) => {
            if (err) return res.status(500).json(err);

            if (teacherResult.length > 0) {
                return res.json({
                    success: true,
                    role: "teacher",
                    id: teacherResult[0].id,
                    dept_id: teacherResult[0].dept_id
                });
            }

            // 3️⃣ Invalid credentials
            res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        });
    });
});

// ================= ADMIN =================
app.post('/admins', (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT id FROM admins WHERE email=? AND password=?";
    db.query(sql, [email, password], (err, result) => {
        if (err) return res.status(500).json(err);

        if (result.length > 0) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    });
});
// ================= TEACHERS CRUD =================

// ADD teacher (Simplified)
app.post("/teacher", (req, res) => {
  const { name, email, dept_id } = req.body; // password removed

  if (!name || !email || !dept_id) {
    return res.status(400).json({ error: "Name, Email, and Department are required" });
  }

  const sql = "INSERT INTO teachers (name, email, dept_id) VALUES (?, ?, ?)";
  db.query(sql, [name, email, dept_id], (err, result) => {
    if (err) return res.status(500).json({ error: "Insert failed" });
    res.json({ success: true, id: result.insertId });
  });
});

// UPDATE teacher (Simplified)
app.put("/teacher/:id", (req, res) => {
  const { name, email, dept_id } = req.body;

  const sql = "UPDATE teachers SET name=?, email=?, dept_id=? WHERE id=?";
  db.query(sql, [name, email, dept_id, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "Update failed" });
    res.json({ success: true });
  });
});
// DELECT teacher

/* ADD teacher
app.post("/teacher", (req, res) => {
  const { name, dept, email, password } = req.body; // ✅ FIXED: password added

  if (!name || !dept || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  db.query(
    "INSERT INTO teachers (name, dept, email, password) VALUES (?, ?, ?, ?)",
    [name, dept, email, password],
    (err) => {
      if (err) return res.status(500).json({ error: "Insert failed" });
      res.json({ success: true });
    }
  );
});

// UPDATE teacher
app.put("/teacher/:id", (req, res) => {
  const { name, dept, email } = req.body;

  db.query(
    "UPDATE teachers SET name=?, dept=?, email=? WHERE id=?",
    [name, dept, email, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: "Update failed" });
      res.json({ success: true });
    }
  );
});

// DELETE teacher
app.delete("/teacher/:id", (req, res) => {
  db.query(
    "DELETE FROM teachers WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: "Delete failed" });
      res.json({ success: true });
    }
  );
});
*/
//=================aDepratment ==================

app.get('/departments', (req, res) => {
    // We use your specific column names: id and name
    const sql = "SELECT id, name FROM departments";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/teachers', (req, res) => {
    const sql = `
        SELECT 
          teachers.id AS teacher_id,
          teachers.name,
          teachers.email,
          departments.name AS dept_name
        FROM teachers
        LEFT JOIN departments ON teachers.dept_id = departments.id
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});


// ================= SUBJECTS CRUD =================
app.get("/subjects", (req, res) => {
  // Use a JOIN to get the name from the departments table
  const sql = `
    SELECT subjects.*, departments.name AS dept_name 
    FROM subjects 
    JOIN departments ON subjects.dept_id = departments.id`;
    
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json([]);
    res.json(result);
  });
});
// ADD SUBJECT
app.put("/subject/:id", (req, res) => {
  const { name, dept_id, sem, hours, is_lab } = req.body;

  const sql = "UPDATE subjects SET name=?, dept_id=?, sem=?, hours=?, is_lab=? WHERE id=?";
  db.query(sql, [name, dept_id, sem, hours, is_lab ? 1 : 0, req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});

// UPDATE SUBJECT
app.put("/subject/:id", (req, res) => {
  const { name, dept, sem, hours, lab } = req.body;

  db.query(
    "UPDATE subjects SET name=?, dept=?, sem=?, hours=?, lab=? WHERE id=?",
    [name, dept, sem, hours, lab ? 1 : 0, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true });
    }
  );
});

// DELETE SUBJECT
app.delete("/subject/:id", (req, res) => {
  db.query(
    "DELETE FROM subjects WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true });
    }
  );
});
//post
app.post("/subject", (req, res) => {
  const { name, dept_id, sem, hours, is_lab } = req.body;

  // Use the exact column names from your CREATE TABLE subjects
  const sql = "INSERT INTO subjects (name, dept_id, sem, hours, is_lab) VALUES (?, ?, ?, ?, ?)";
  
  db.query(sql, [name, dept_id, sem, hours, is_lab], (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: "Database insertion failed" });
    }
    res.status(200).json({ success: true, id: result.insertId });
  });
});


// ================= DASHBOARD STATS =================
app.get("/stats/subjects", (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM subjects", (err, result) => {
    if (err) return res.json({ total: 0 });
    res.json({ total: result[0].total });
  });
});


// ================= TIMETABLE =================
app.post("/generate", (req, res) => {
  db.query("DELETE FROM timetable", () => {
    db.query("SELECT * FROM subjects", (err, subjects) => {
      if (err) return res.json({ success: false });

      const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
      let period = 1;

      subjects.forEach((s, i) => {
        db.query(
          "INSERT INTO timetable (day, period, subject) VALUES (?,?,?)",
          [days[i % 5], period++, s.name]
        );
      });

      res.json({ message: "Timetable Generated Successfully" });
    });
  });
});

app.get("/timetable", (req, res) => {
  db.query("SELECT * FROM timetable", (err, result) => {
    if (err) return res.json([]);
    res.json(result);
  });
});


// ================= SERVER =================
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});