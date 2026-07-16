-- ============================================================================
--  The One — Reference / configuration seed (safe to run repeatedly)
--  Applicant + admin accounts require auth users and are created by the
--  Node seed script: `npm run seed` (see scripts/seed.mjs). This file seeds
--  only reference data that does not depend on auth.users.
-- ============================================================================

-- Application sections (steps) ------------------------------------------------
insert into application_sections (key, title, step_order) values
  ('basic_information', 'Basic Information', 1),
  ('relationship_status', 'Relationship Status', 2),
  ('faith_values', 'Faith & Values', 3),
  ('career_financial', 'Career & Financial Life', 4),
  ('lifestyle', 'Lifestyle', 5),
  ('emotional_intelligence', 'Emotional Intelligence', 6),
  ('leadership_partnership', 'Leadership & Partnership', 7),
  ('relationship_vision', 'Relationship Vision', 8),
  ('personal_introduction', 'Personal Introduction', 9),
  ('media', 'Media Upload', 10),
  ('consent', 'Consent & Certification', 11),
  ('review', 'Review & Submit', 12)
on conflict (key) do nothing;

-- Compatibility categories with placeholder weights --------------------------
insert into compatibility_categories (key, label, weight, sort_order) values
  ('faith_alignment', 'Faith Alignment', 1.5, 1),
  ('relationship_readiness', 'Relationship Readiness', 1.5, 2),
  ('emotional_maturity', 'Emotional Maturity', 1.3, 3),
  ('communication', 'Communication', 1.2, 4),
  ('family_vision', 'Family Vision', 1.2, 5),
  ('financial_responsibility', 'Financial Responsibility', 1.0, 6),
  ('career_compatibility', 'Career Compatibility', 0.8, 7),
  ('lifestyle_compatibility', 'Lifestyle Compatibility', 0.8, 8),
  ('leadership_partnership', 'Leadership & Partnership', 1.0, 9),
  ('conflict_resolution', 'Conflict Resolution', 1.1, 10),
  ('geographic_compatibility', 'Geographic Compatibility', 0.7, 11),
  ('long_term_vision', 'Long-Term Vision', 1.2, 12)
on conflict (key) do nothing;

-- A few representative assessment questions ----------------------------------
insert into assessment_questions (key, prompt, input_type, is_required, sort_order, section_id)
select v.key, v.prompt, v.input_type, v.is_required, v.sort_order, s.id
from (values
  ('ei_wrong', 'Describe a time you were wrong in a relationship.', 'textarea', true, 1, 'emotional_intelligence'),
  ('ei_last_lesson', 'What did your last relationship teach you about yourself?', 'textarea', true, 2, 'emotional_intelligence'),
  ('ei_space', 'How do you respond when someone you love needs space?', 'textarea', true, 3, 'emotional_intelligence'),
  ('ei_safety', 'What does emotional safety mean to you?', 'textarea', true, 4, 'emotional_intelligence'),
  ('lead_meaning', 'What does healthy leadership in a relationship mean to you?', 'textarea', true, 1, 'leadership_partnership'),
  ('vision_why_now', 'Why are you seeking a relationship now?', 'textarea', true, 1, 'relationship_vision'),
  ('intro_first_question', 'One question you would ask on a first date?', 'text', true, 1, 'personal_introduction')
) as v(key, prompt, input_type, is_required, sort_order, section_key)
join application_sections s on s.key = v.section_key
on conflict (key) do nothing;

-- System settings ------------------------------------------------------------
insert into system_settings (key, value) values
  ('applications_open', 'true'::jsonb),
  ('minimum_age', '30'::jsonb)
on conflict (key) do nothing;
