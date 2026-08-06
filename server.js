const express = require("express");
const cors = require("cors");
const db = require("./db.js");

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
  const { name, email, dept_id, password } = req.body;

  if (!name || !email || !dept_id || !password) {
    return res.status(400).json({ error: "Name, Email, Department, and Password are required" });
  }

  const sql = "INSERT INTO teachers (name, email, dept_id, password) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, email, dept_id, password], (err, result) => {
    if (err) return res.status(500).json({ error: "Insert failed" });
    res.json({ success: true, id: result.insertId });
  });
});

// UPDATE teacher (Simplified)
app.put("/teacher/:id", (req, res) => {
  const { name, email, dept_id, password } = req.body;

  let sql = "UPDATE teachers SET name=?, email=?, dept_id=? WHERE id=?";
  let params = [name, email, dept_id, req.params.id];

  if (password) {
    sql = "UPDATE teachers SET name=?, email=?, dept_id=?, password=? WHERE id=?";
    params = [name, email, dept_id, password, req.params.id];
  }

  db.query(sql, params, (err) => {
    if (err) return res.status(500).json({ error: "Update failed" });
    res.json({ success: true });
  });
});
// DELECT teacher
app.delete("/teacher/:id", (req, res) => {
  db.query("DELETE FROM teachers WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "Delete failed" });
    res.json({ success: true });
  });
});

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
        t.id AS teacher_id,
        t.name,
        t.email,
        d.name AS dept_name,
        GROUP_CONCAT(s.name SEPARATOR ', ') as subjects
      FROM teachers t
      LEFT JOIN departments d ON t.dept_id = d.id
      LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
      LEFT JOIN subjects s ON ts.subject_id = s.id
      GROUP BY t.id
    `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);

    // Fetch absences to map onto the dataset
    db.query('SELECT teacher_id FROM teacher_availability WHERE date = CURDATE() AND available = 0', (err2, absents) => {
      // Don't crash if teacher_availability is missing
      if (err2) {
        return res.json(results);
      }
      const absentIds = absents ? absents.map(a => a.teacher_id) : [];
      const updatedResults = results.map(t => ({ ...t, is_absent: absentIds.includes(t.teacher_id) }));
      res.json(updatedResults);
    });
  });
});

// ASSIGN MULTIPLE SUBJECTS TO A TEACHER
app.post('/teacher/subjects', (req, res) => {
  const { teacher_id, subject_id } = req.body;
  if (!teacher_id || !subject_id) return res.status(400).json({ error: "teacher_id and subject_id required" });

  const sql = "INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)";
  db.query(sql, [teacher_id, subject_id], (err) => {
    if (err) return res.status(500).json({ error: "Failed to map subject" });
    res.json({ success: true, message: "Subject mapped successfully" });
  });
});

// DELETE SUBJECT ASSIGNMENT FROM A TEACHER
app.delete('/teacher/subjects/:teacher_id/:subject_id', (req, res) => {
  const { teacher_id, subject_id } = req.params;
  const sql = "DELETE FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?";
  db.query(sql, [teacher_id, subject_id], (err) => {
    if (err) return res.status(500).json({ error: "Failed to remove subject" });
    res.json({ success: true, message: "Subject mapping removed" });
  });
});



// ================= CLASS COMPLETION TRACKING =================

// Mark a class as completed (when teacher clicks period cell)
app.post('/classcomplete', (req, res) => {
  const { teacher_id, subject_id, period } = req.body;
  if (!teacher_id || !subject_id) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // "if the teacher is present and the class equal to current time do store the time"
  const sql = `
    INSERT INTO course_logs (teacher_id, subject_id, status)
    VALUES (?, ?, 'completed')
  `;
  db.query(sql, [teacher_id, subject_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error storing completion' });
    }
    res.json({ success: true, message: 'Class marked as completed' });
  });
});

// Get completed classes for today
app.get('/classcomplete/today', (req, res) => {
  const sql = `
    SELECT cl.*, t.name as teacher_name, s.name as subject_name 
    FROM course_logs cl
    JOIN teachers t ON cl.teacher_id = t.id
    JOIN subjects s ON cl.subject_id = s.id
    WHERE DATE(cl.completed_at) = CURDATE()
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});


// ================= SUBJECT CRUD =================
app.get('/subjects', (req, res) => {
  const sql = `
    SELECT 
      s.*, 
      d.name as dept_name,
      s.completed_hours as currentcompletedhours,
      GROUP_CONCAT(t.name SEPARATOR ', ') as teachers
    FROM subjects s 
    LEFT JOIN departments d ON s.dept_id = d.id
    LEFT JOIN teacher_subjects ts ON s.id = ts.subject_id
    LEFT JOIN teachers t ON ts.teacher_id = t.id
    GROUP BY s.id`;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// RESET WEEKLY HOURS (Admin: Manage Student Hours)
app.post('/subjects/reset-weekly', (req, res) => {
  const sql = `
    UPDATE subjects 
    SET total_completed_hours = total_completed_hours + completed_hours,
        completed_hours = 0
  `;
  db.query(sql, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to reset weekly hours' });
    }
    res.json({ success: true, message: 'Weekly hours reset successfully' });
  });
});

// UPDATE completed hours for a subject (Admin: Manage Student Hours)
app.put('/subject/:id/hours', (req, res) => {
  const { completed_hours } = req.body;
  const subjectId = req.params.id;

  if (completed_hours === undefined || completed_hours === null) {
    return res.status(400).json({ error: 'completed_hours is required' });
  }

  // First validate against hours_required
  db.query('SELECT hours_required FROM subjects WHERE id = ?', [subjectId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (rows.length === 0) return res.status(404).json({ error: 'Subject not found' });

    const hoursRequired = rows[0].hours_required;
    if (parseInt(completed_hours) > hoursRequired) {
      return res.status(400).json({
        error: `Completed hours (${completed_hours}) cannot exceed required hours (${hoursRequired})`
      });
    }

    db.query('UPDATE subjects SET completed_hours = ? WHERE id = ?', [parseInt(completed_hours), subjectId], (err2) => {
      if (err2) return res.status(500).json({ error: 'Update failed' });
      res.json({ success: true, message: 'Hours updated successfully' });
    });
  });
});

app.post('/subject', (req, res) => {
  const { code, name, dept_id, sem, hours_required, hours, is_lab } = req.body;
  let hrs = hours_required || hours || 3;

  if (!name || !dept_id || !sem || !hrs) {
    return res.status(400).json({ error: 'All fields required' });
  }

  // Notice no code and is_lab in 3NF college_timetable_me schema
  db.query(
    'INSERT INTO subjects (code, name, dept_id, sem, hours_required, is_lab) VALUES (?, ?, ?, ?, ?, ?)',
    [code || '', name, dept_id, sem, hrs, is_lab || 0],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Subject exists' });
        console.error("SQL Error:", err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ message: 'Subject added successfully', id: result.insertId });
    }
  );
});

app.put('/subject/:id', (req, res) => {
  const { code, name, dept_id, sem, hours_required, hours, is_lab } = req.body;
  let hrs = hours_required || hours || 3;
  db.query(
    'UPDATE subjects SET code=?, name=?, dept_id=?, sem=?, hours_required=?, is_lab=? WHERE id=?',
    [code || '', name, dept_id, sem, hrs, is_lab || 0, req.params.id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
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

// ======================= Classrooms API =======================
app.get('/classrooms', (req, res) => {
  db.query('SELECT * FROM classrooms ORDER BY room_no', (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(results);
  });
});

app.post('/classroom', (req, res) => {
  const { room_no, capacity } = req.body;
  if (!room_no || !capacity) return res.status(400).json({ error: 'All fields required' });
  db.query('INSERT INTO classrooms (room_no, capacity) VALUES (?, ?)', [room_no, capacity], (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ message: 'Classroom added successfully' });
  });
});

app.delete('/classroom/:id', (req, res) => {
  db.query('DELETE FROM classrooms WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ message: 'Classroom deleted' });
  });
});

// ======================= Classes (Batches) API =======================
app.get('/classes', (req, res) => {
  const query = `
    SELECT c.*, d.name as dept_name 
    FROM classes c 
    LEFT JOIN departments d ON c.dept_id = d.id
    ORDER BY c.sem, c.name
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(results);
  });
});

app.post('/class', (req, res) => {
  const { name, dept_id, sem, strength } = req.body;
  if (!name || !dept_id || !sem || !strength) return res.status(400).json({ error: 'All fields required' });
  db.query('INSERT INTO classes (name, dept_id, sem, strength) VALUES (?, ?, ?, ?)',
    [name, dept_id, sem, strength], (err) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ message: 'Class added successfully' });
    });
});

app.delete('/class/:id', (req, res) => {
  db.query('DELETE FROM classes WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ message: 'Class deleted' });
  });
});

// ======================= Locked Slots API =======================
app.get('/locked_slots', (req, res) => {
  const query = `
    SELECT ls.*, c.name as class_name 
    FROM locked_slots ls 
    LEFT JOIN classes c ON ls.class_id = c.id
    ORDER BY ls.day, ls.period
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(results);
  });
});

app.post('/locked_slots', (req, res) => {
  const { class_id, event_name, day, period, is_lab_slot } = req.body;
  if (!class_id || !event_name || !day || !period) return res.status(400).json({ error: 'All fields required' });
  db.query('INSERT INTO locked_slots (class_id, event_name, day, period, is_lab_slot) VALUES (?, ?, ?, ?, ?)',
    [class_id, event_name, day, period, is_lab_slot || 0], (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Slot already locked' });
        return res.status(500).json({ error: 'DB error' });
      }
      res.json({ message: 'Slot added successfully' });
    });
});

app.delete('/locked_slots/:id', (req, res) => {
  db.query('DELETE FROM locked_slots WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ message: 'Slot deleted' });
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
// GET available teachers count for today
app.get('/teachers/available', (req, res) => {
  const sql = `
    SELECT COUNT(*) AS total 
    FROM teachers t
    WHERE t.id NOT IN (
      SELECT teacher_id FROM teacher_availability WHERE date = CURDATE() AND available = 0
    )
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ total: result[0].total });
  });
});

// GET total weekly hours from subjects
app.get('/stats/hours', (req, res) => {
  db.query('SELECT SUM(hours_required) AS total FROM subjects', (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ total: result[0].total || 0 });
  });
});
// ================= TIMETABLE CRUD =================
app.get('/timetable', (req, res) => {
  const sql = `
    SELECT 
      timetable_id AS id,
      day,
      period,
      semester AS sem,
      dept_name,
      subject_name,
      subject_code,
      teacher_name,
      class_name,
      classroom_no AS room_no,
      is_lab,
      status
    FROM timetable_view
    ORDER BY class_name, day, period
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// GET published timetable only (for student view)
app.get('/timetable/published', (req, res) => {
  const sql = `
    SELECT 
      timetable_id AS id,
      day,
      period,
      semester AS sem,
      dept_name,
      subject_name,
      subject_code,
      teacher_name,
      class_name,
      classroom_no AS room_no,
      is_lab
    FROM timetable_view
    WHERE status = 'published'
    ORDER BY class_name, day, period
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// EDIT TIMETABLE SLOT ENDPOINT
app.put('/timetable/:id', (req, res) => {
  const { id } = req.params;
  const { subject_id, teacher_id } = req.body;

  // Minimal update statement. In reality, you'd build this dynamically based on what was provided.
  db.query(
    "UPDATE timetable SET subject_id = IFNULL(?, subject_id), teacher_id = IFNULL(?, teacher_id), classroom_id = IFNULL(?, classroom_id) WHERE id = ?",
    [subject_id, teacher_id, classroom_id, id],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, message: 'Slot updated' });
    }
  );
});

// ================= FIXED TIMETABLE GENERATOR =================
// ================= GENERATE TIMETABLE =================
const generateTimetable = require('./generator');

app.post('/generate', async (req, res) => {
  let { dept, sem } = req.body;
  if (!dept) dept = 1;
  if (!sem) sem = 'odd';
  try {
    await generateTimetable(dept, sem);
    res.json({ success: true, message: "Timetable generated successfully" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Generation failed" });
  }
});

// TEACHER ABSENCE ENDPOINT
app.post('/teacher/absent', (req, res) => {
  const { teacher_id, absent } = req.body;
  const isAvailable = absent ? 0 : 1;
  db.query("DELETE FROM teacher_availability WHERE teacher_id = ? AND date = CURDATE()", [teacher_id], () => {
    db.query("INSERT INTO teacher_availability (teacher_id, date, available) VALUES (?, CURDATE(), ?)", [teacher_id, isAvailable], (err) => {
      if (err) return res.status(500).json({ error: 'DB Error' });
      res.json({ success: true });
    });
  });
});

// PUBLISH TIMETABLE ENDPOINT
app.post('/timetable/publish', (req, res) => {
  db.query("UPDATE timetable SET status = 'published' WHERE status != 'archived'", (err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Published successfully' });
  });
});

// ================= SERVER =================
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});