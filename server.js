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

//==========TOTAL TEACHER COUNT ========
// GET total teachers count
app.get('/teachers/count', (req, res) => {
  db.query(
    'SELECT COUNT(*) AS total FROM teachers',
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ total: result[0].total });
    }
  );
});
//==========TOTAL hoursT ========
// GET total teachers count
app.get('/teachers/count', (req, res) => {
  db.query(
    'SELECT COUNT(time) AS total FROM teachers',
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ total: result[0].total });
    }
  );
});
// ================= FIXED TIMETABLE GENERATOR =================
// ================= GENERATE TIMETABLE =================
app.post('/generate', (req, res) => {  

    const { dept, sem } = req.body;    

    if (!dept || !sem) {
        return res.json({ success:false, message:"Send dept & sem" });
    }

    const DAYS = ['Mon','Tue','Wed','Thu','Fri'];
    const MAX_PERIODS = 6;

    // timetable grid
    let grid = {};
    DAYS.forEach(day => {
        grid[day] = new Array(MAX_PERIODS).fill(null);
    });

    // shuffle helper
    function shuffle(arr){
        return arr.sort(() => Math.random() - 0.5);
    }

    // clear old timetable
    db.query(
      "DELETE FROM timetable WHERE dept_id=? AND sem=?",   // 🔴 CHANGED: dept → dept_id
      [dept, sem],
      (err) => {

        if(err) return res.json({ success:false, message:"Delete failed" });

        // get subjects
        db.query(
            "SELECT * FROM subjects WHERE dept_id=? AND sem=?", // 🔴 CHANGED: dept → dept_id
            [dept, sem],
            (err, subjects) => {

                if(err) return res.json({ success:false });

                if(subjects.length === 0)
                    return res.json({ success:false, message:"No subjects found" });

                subjects = shuffle(subjects);

                // ================= PLACE SUBJECTS =================
                subjects.forEach(sub => {

                    // ===== LAB (3 continuous hours) =====
                    if(sub.lab == 1){

                        let placed = false;
                        let attempts = 0;               // 🔴 CHANGED: safety counter

                        while(!placed && attempts < 100){
                            attempts++;

                            let day = DAYS[Math.floor(Math.random()*5)];
                            let start = Math.floor(Math.random()*4); // 0–3

                            if(
                                !grid[day][start] &&
                                !grid[day][start+1] &&
                                !grid[day][start+2]
                            ){
                                for(let i=0;i<3;i++){
                                    grid[day][start+i] = {
                                        subject_id: sub.id,       // 🔴 CHANGED: store IDs
                                        teacher_id: sub.teacher_id
                                    };
                                }
                                placed = true;
                            }
                        }
                    }

                    // ===== THEORY =====
                    else{
                        for(let h=0; h<sub.hours; h++){

                            let placed = false;
                            let attempts = 0;           // 🔴 CHANGED: safety counter

                            while(!placed && attempts < 100){
                                attempts++;

                                let day = DAYS[Math.floor(Math.random()*5)];
                                let p = Math.floor(Math.random()*6);

                                if(!grid[day][p]){
                                    grid[day][p] = {
                                        subject_id: sub.id,       // 🔴 CHANGED
                                        teacher_id: sub.teacher_id
                                    };
                                    placed = true;
                                }
                            }
                        }
                    }
                });

                // ================= INSERT INTO DB =================
                let values = [];

                DAYS.forEach(day => {
                    grid[day].forEach((cell, index) => {
                        if(cell){
                            values.push([
                                dept,
                                sem,
                                day,
                                index + 1,               // 🔴 CHANGED: period starts from 1
                                cell.subject_id,
                                cell.teacher_id,
                                0
                            ]);
                        }
                    });
                });

                db.query(
                    `INSERT INTO timetable
                     (dept_id, sem, day, period, subject_id, teacher_id, fixed)
                     VALUES ?`,
                    [values],
                    (err) => {
                        if(err){
                            console.log(err);
                            return res.json({ success:false, message:"Insert failed" });
                        }
                        res.json({ success:true, message:"Timetable generated successfully" });
                    }
                );
            }
        );
    });
});
// ================= SERVER =================
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});