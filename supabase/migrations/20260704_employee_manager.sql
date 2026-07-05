-- Reporting structure: each employee reports to their department's most senior lead.
-- Run this in the Supabase SQL Editor.

-- 1. Column (self-referencing FK)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES employees(id);

-- 2. Determine each department's head by seniority rank, then earliest start date.
WITH ranked AS (
  SELECT
    id,
    department_id,
    ROW_NUMBER() OVER (
      PARTITION BY department_id
      ORDER BY
        (CASE
          WHEN role_title ILIKE '%architect%' THEN 4
          WHEN role_title ILIKE '%lead%'      THEN 3
          WHEN role_title ILIKE '%senior%'    THEN 2
          ELSE 1
        END) DESC,
        start_date ASC
    ) AS rn
  FROM employees
  WHERE status = 'active'
),
heads AS (
  SELECT department_id, id AS manager_id FROM ranked WHERE rn = 1
)
-- 3. Everyone in the department reports to that head; the head's manager stays NULL.
UPDATE employees e
SET manager_id = h.manager_id
FROM heads h
WHERE e.department_id = h.department_id
  AND e.id <> h.manager_id;
