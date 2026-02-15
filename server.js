const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));


// ================= LOGIN =================
// ================= LOGIN =================
app.post("/teacherlogin", (req, res) => {
  const { email, password } = req.body;

  // STEP 1: Check ADMIN table
  db.query(
    "SELECT id FROM admins WHERE email=? AND password=?",
    [email, password],
    (err, adminResult) => {
      if (err) {
        res.json({ success: false });
        return;
      }

      if (adminResult.length > 0) {
        // ADMIN FOUND
        res.json({
          success: true,
          isAdmin: true
        });
        return;
      }

      // STEP 2: Check TEACHER table
      db.query(
        "SELECT id FROM teacherlogin WHERE email=? AND password=?",
        [email, password],
        (err, teacherResult) => {
          if (err) {
            res.json({ success: false });
            return;
          }

          if (teacherResult.length > 0) {
            res.json({
              success: true,
              isAdmin: false
            });
          } else {
            res.json({
              success: false,
              message: "Wrong email or password"
            });
          }
        }
      );
    }
  );
});

// ================= TEACHERS CRUD =================

app.get("/teachers",(req,res)=>{
  db.query("SELECT * FROM teachers",(err,result)=>{
    res.json(result);
  });
});

app.post("/teacher",(req,res)=>{
  const {name,dept,email} = req.body;
  db.query(
    "INSERT INTO teachers(name,dept,email) VALUES(?,?,?)",
    [name,dept,email],
    ()=>res.json({success:true})
  );
});

app.put("/teacher/:id",(req,res)=>{
  const {name,dept,email} = req.body;
  db.query(
    "UPDATE teachers SET name=?,dept=?,email=? WHERE id=?",
    [name,dept,email,req.params.id],
    ()=>res.json({success:true})
  );
});

app.delete("/teacher/:id",(req,res)=>{
  db.query("DELETE FROM teachers WHERE id=?",
    [req.params.id],
    ()=>res.json({success:true})
  );
});


// ================= SUBJECTS CRUD =================

app.get("/subjects",(req,res)=>{
  db.query("SELECT * FROM subjects",(err,result)=>{
    res.json(result);
  });
});

app.post("/subject",(req,res)=>{
  const {name,dept,sem,hours,lab} = req.body;
  db.query(
    "INSERT INTO subjects(name,dept,sem,hours,lab) VALUES(?,?,?,?,?)",
    [name,dept,sem,hours,lab],
    ()=>res.json({success:true})
  );
});

app.put("/subject/:id",(req,res)=>{
  const {name,dept,sem,hours,lab} = req.body;
  db.query(
    "UPDATE subjects SET name=?,dept=?,sem=?,hours=?,lab=? WHERE id=?",
    [name,dept,sem,hours,lab,req.params.id],
    ()=>res.json({success:true})
  );
});

app.delete("/subject/:id",(req,res)=>{
  db.query("DELETE FROM subjects WHERE id=?",
    [req.params.id],
    ()=>res.json({success:true})
  );
});


// ================= GENERATE TIMETABLE =================

app.post("/generate",(req,res)=>{

  db.query("DELETE FROM timetable");

  db.query("SELECT * FROM subjects",(err,subjects)=>{

    let days=["Mon","Tue","Wed","Thu","Fri"];
    let period=1;

    subjects.forEach((s,i)=>{
      db.query(
        "INSERT INTO timetable(day,period,subject) VALUES(?,?,?)",
        [days[i%5],period++,s.name]
      );
    });

    res.json({message:"Timetable Generated Successfully"});
  });
});


// ================= VIEW TIMETABLE =================

app.get("/timetable",(req,res)=>{
  db.query("SELECT * FROM timetable",(err,result)=>{
    res.json(result);
  });
});

app.listen(3000,()=>{
  console.log("🚀 Server running at http://localhost:3000");
});
