-- Clean up Talent Inbox: remove test applications and de-duplicate applicants.
-- Keeps ONE row per (name + title), preferring the furthest-along status, then newest.
-- Deletes child rows first to satisfy foreign keys. Run in the Supabase SQL Editor.

-- 1. Collect the application ids to delete: test data + duplicates.
CREATE TEMP TABLE _del_apps AS
SELECT id FROM applications
WHERE full_name ILIKE 'test%' OR role_title ILIKE 'test%'
UNION
SELECT id FROM (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim(full_name)), lower(trim(role_title))
      ORDER BY
        CASE status
          WHEN 'hired'     THEN 6
          WHEN 'offer'     THEN 5
          WHEN 'interview' THEN 4
          WHEN 'reviewing' THEN 3
          WHEN 'new'       THEN 2
          WHEN 'rejected'  THEN 1
          ELSE 0
        END DESC,
        created_at DESC
    ) AS rn
  FROM applications
) ranked
WHERE rn > 1;

-- 2. Remove child rows that reference those applications.
DELETE FROM interviews             WHERE application_id IN (SELECT id FROM _del_apps);
DELETE FROM offers                 WHERE application_id IN (SELECT id FROM _del_apps);
DELETE FROM candidate_assessments  WHERE application_id IN (SELECT id FROM _del_apps);

-- 3. Detach any employee that happened to reference a deleted duplicate application.
UPDATE employees SET application_id = NULL WHERE application_id IN (SELECT id FROM _del_apps);

-- 4. Remove the applications themselves.
DELETE FROM applications WHERE id IN (SELECT id FROM _del_apps);

DROP TABLE _del_apps;
