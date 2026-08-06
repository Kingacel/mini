-- Migration: Add status column to timetable, completed_hours to subjects
-- Run this on your college_timetable_me database

USE college_timetable_me;

-- 1. Add status column to timetable (draft / published)
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';

-- 2. Add completed_hours column to subjects (admin editable)
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS completed_hours INT DEFAULT 0;

-- 3. Update timetable_view to include status and teacher_name
CREATE OR REPLACE VIEW timetable_view AS
SELECT 
  t.id AS timetable_id,
  c.name AS class_name,
  c.sem AS semester,
  d.name AS dept_name,
  t.day,
  t.period,
  s.name AS subject_name,
  s.code AS subject_code,
  s.is_lab,
  tr.name AS teacher_name,
  cr.room_no AS classroom_no,
  t.status
FROM timetable t
LEFT JOIN classes c ON t.class_id = c.id
LEFT JOIN departments d ON t.dept_id = d.id
LEFT JOIN subjects s ON t.subject_id = s.id
LEFT JOIN teachers tr ON t.teacher_id = tr.id
LEFT JOIN classrooms cr ON t.classroom_id = cr.id;
