-- Per-employee compensation profile
-- Adds real base salary + pay details to each employee, seeded within their
-- department's compensation band, scaled by title seniority and tenure.
-- Run this in the Supabase SQL Editor.

-- 1. Columns
ALTER TABLE employees ADD COLUMN IF NOT EXISTS base_salary       NUMERIC(12,2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_type          TEXT CHECK (pay_type IN ('salary','hourly'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bonus_target_pct  NUMERIC(5,2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS equity_units      NUMERIC(12,2);

-- 2. Populate from the department's compensation band.
--    Seniority factor: Senior/Lead/Architect land higher in the band; tenure nudges upward.
UPDATE employees e
SET
  pay_type = 'salary',
  base_salary = ROUND(
    (
      cb.min_salary
      + (cb.max_salary - cb.min_salary) * LEAST(1.0, GREATEST(0.20,
          -- seniority baseline
          (CASE
            WHEN e.role_title ILIKE '%senior%'    THEN 0.70
            WHEN e.role_title ILIKE '%lead%'      THEN 0.75
            WHEN e.role_title ILIKE '%architect%' THEN 0.72
            WHEN e.role_title ILIKE '%technician%' THEN 0.25
            ELSE 0.45
          END)
          -- tenure bump: up to +0.20 over ~5 years
          + LEAST(0.20, GREATEST(0, EXTRACT(EPOCH FROM (NOW() - e.start_date)) / EXTRACT(EPOCH FROM INTERVAL '5 years') * 0.20))
        ))
    ) / 1000
  ) * 1000,
  bonus_target_pct = CASE
    WHEN e.role_title ILIKE '%account executive%' THEN 40
    WHEN e.role_title ILIKE '%lead%' OR e.role_title ILIKE '%architect%' THEN 15
    WHEN e.role_title ILIKE '%senior%' THEN 12
    ELSE 10
  END,
  equity_units = CASE
    WHEN e.role_title ILIKE '%lead%' OR e.role_title ILIKE '%architect%' THEN 8000
    WHEN e.role_title ILIKE '%senior%' THEN 5000
    ELSE 2500
  END
FROM compensation_bands cb
WHERE cb.department_id = e.department_id
  AND e.base_salary IS NULL;
