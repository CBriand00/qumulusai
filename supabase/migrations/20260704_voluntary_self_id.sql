-- Voluntary self-identification (EEO) fields, collected during onboarding.
-- These are OPTIONAL and self-reported; "decline" means declined to self-identify.
-- Run this in the Supabase SQL Editor.

-- 1. Columns
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender            TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ethnicity         TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS veteran_status    TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS disability_status TEXT;

-- 2. Seed existing employees with a realistic voluntary self-ID spread (demo data).
UPDATE employees SET gender='male',   ethnicity='white',           veteran_status='not_veteran', disability_status='no'      WHERE id='e1000000-0000-0000-0000-000000000001';
UPDATE employees SET gender='female', ethnicity='asian',           veteran_status='not_veteran', disability_status='no'      WHERE id='e1000000-0000-0000-0000-000000000002';
UPDATE employees SET gender='male',   ethnicity='asian',           veteran_status='veteran',     disability_status='no'      WHERE id='e1000000-0000-0000-0000-000000000003';
UPDATE employees SET gender='female', ethnicity='black',           veteran_status='not_veteran', disability_status='no'      WHERE id='e1000000-0000-0000-0000-000000000004';
UPDATE employees SET gender='male',   ethnicity='hispanic_latino', veteran_status='not_veteran', disability_status='no'      WHERE id='e1000000-0000-0000-0000-000000000005';
UPDATE employees SET gender='female', ethnicity='decline',         veteran_status='not_veteran', disability_status='no'      WHERE id='e1000000-0000-0000-0000-000000000006';
UPDATE employees SET gender='female', ethnicity='asian',           veteran_status='not_veteran', disability_status='no'      WHERE id='e1000000-0000-0000-0000-000000000007';
UPDATE employees SET gender='male',   ethnicity='white',           veteran_status='veteran',     disability_status='no'      WHERE id='e1000000-0000-0000-0000-000000000008';
UPDATE employees SET gender='male',   ethnicity='asian',           veteran_status='not_veteran', disability_status='yes'     WHERE id='e1000000-0000-0000-0000-000000000009';
UPDATE employees SET gender='female', ethnicity='black',           veteran_status='not_veteran', disability_status='no'      WHERE id='e1000000-0000-0000-0000-000000000010';
UPDATE employees SET gender='male',   ethnicity='black',           veteran_status='not_veteran', disability_status='decline' WHERE id='e1000000-0000-0000-0000-000000000011';
UPDATE employees SET gender='female', ethnicity='white',           veteran_status='not_veteran', disability_status='no'      WHERE id='e1000000-0000-0000-0000-000000000012';
