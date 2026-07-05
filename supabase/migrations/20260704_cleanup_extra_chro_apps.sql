-- Remove the extra demo "Chief Human Resources Officer" applicants
-- (John Jacob, Chateau King), keeping the real hired Chateau Briand record.
-- Deletes child rows first to satisfy foreign keys. Run in the Supabase SQL Editor.

CREATE TEMP TABLE _del_apps AS
SELECT id FROM applications
WHERE role_title ILIKE 'Chief Human Resources Officer'
  AND (full_name ILIKE 'John Jacob' OR full_name ILIKE 'Chateau King');

DELETE FROM interviews             WHERE application_id IN (SELECT id FROM _del_apps);
DELETE FROM offers                 WHERE application_id IN (SELECT id FROM _del_apps);
DELETE FROM candidate_assessments  WHERE application_id IN (SELECT id FROM _del_apps);
UPDATE employees SET application_id = NULL WHERE application_id IN (SELECT id FROM _del_apps);
DELETE FROM applications WHERE id IN (SELECT id FROM _del_apps);

DROP TABLE _del_apps;
