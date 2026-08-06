-- Add total_completed_hours for weekly tracking
ALTER TABLE subjects
ADD COLUMN total_completed_hours INT DEFAULT 0;
