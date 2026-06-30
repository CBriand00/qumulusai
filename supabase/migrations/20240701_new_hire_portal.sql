-- New Hire Portal: onboarding docs table + onboarding_token on employees
-- Run this in Supabase SQL Editor

-- Add onboarding_token column to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS onboarding_token UUID;
CREATE UNIQUE INDEX IF NOT EXISTS employees_onboarding_token_idx ON employees (onboarding_token) WHERE onboarding_token IS NOT NULL;

-- New hire onboarding documents table
CREATE TABLE IF NOT EXISTS employee_onboarding_docs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           UUID REFERENCES employees(id) ON DELETE CASCADE,
  organization_id       UUID,

  -- W-4
  w4_filing_status      TEXT,
  w4_multiple_jobs      BOOLEAN DEFAULT FALSE,
  w4_dependents         NUMERIC(10,2) DEFAULT 0,
  w4_other_income       NUMERIC(10,2) DEFAULT 0,
  w4_deductions         NUMERIC(10,2) DEFAULT 0,
  w4_extra_withholding  NUMERIC(10,2) DEFAULT 0,
  w4_signed_at          TIMESTAMPTZ,

  -- Direct Deposit
  dd_bank_name          TEXT,
  dd_account_type       TEXT CHECK (dd_account_type IN ('checking', 'savings')),
  dd_routing_number     TEXT,
  dd_account_number     TEXT,
  dd_signed_at          TIMESTAMPTZ,

  -- I-9
  i9_other_last_names   TEXT,
  i9_address            TEXT,
  i9_city               TEXT,
  i9_state              TEXT,
  i9_zip                TEXT,
  i9_dob                DATE,
  i9_ssn_last4          TEXT,
  i9_email              TEXT,
  i9_phone              TEXT,
  i9_attestation        TEXT CHECK (i9_attestation IN ('citizen','noncitizen_national','lawful_permanent_resident','alien_authorized')),
  i9_signed_at          TIMESTAMPTZ,

  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','complete')),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS employee_onboarding_docs_updated_at ON employee_onboarding_docs;
CREATE TRIGGER employee_onboarding_docs_updated_at
  BEFORE UPDATE ON employee_onboarding_docs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
