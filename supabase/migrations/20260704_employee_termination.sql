-- Employee offboarding / termination (soft delete).
-- Terminated employees keep their record for compliance; status flips out of
-- 'active' so every roster view drops them automatically.
-- Run this in the Supabase SQL Editor.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_date   DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_type   TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_reason TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS terminated_at      TIMESTAMPTZ;
