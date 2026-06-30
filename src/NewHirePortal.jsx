import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const TODAY = new Date().toISOString().slice(0, 10);
const STEPS = ["W-4 Tax Withholding", "Direct Deposit", "I-9 Eligibility"];

const S = {
  shell:       { minHeight: "100vh", background: "#F7F8FA", color: "#0F172A", fontFamily: "'Inter', -apple-system, sans-serif" },
  center:      { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F8FA", fontFamily: "'Inter', -apple-system, sans-serif" },
  header:      { padding: "24px 32px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 16, background: "#fff" },
  wordmark:    { fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: "#0A2540" },
  ai:          { color: "#2563EB" },
  subtitle:    { fontSize: 13, color: "#64748B", margin: 0 },
  content:     { maxWidth: 680, margin: "0 auto", padding: "40px 32px", display: "flex", flexDirection: "column", gap: 24 },
  card:        { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  cardTitle:   { fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "#0F172A" },
  cardSub:     { fontSize: 13, color: "#64748B", margin: "0 0 24px" },
  label:       { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, marginTop: 16 },
  input:       { width: "100%", boxSizing: "border-box", background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 12px", color: "#0F172A", fontSize: 14, outline: "none" },
  select:      { width: "100%", boxSizing: "border-box", background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 12px", color: "#0F172A", fontSize: 14, outline: "none", cursor: "pointer" },
  checkRow:    { display: "flex", alignItems: "center", gap: 10, marginTop: 16 },
  checkLabel:  { fontSize: 14, color: "#374151" },
  signNote:    { fontSize: 13, color: "#64748B", margin: "20px 0 8px", borderTop: "1px solid #F1F5F9", paddingTop: 20 },
  signInput:   { width: "100%", boxSizing: "border-box", background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px 14px", color: "#0F172A", fontSize: 16, fontStyle: "italic", outline: "none", marginBottom: 12 },
  row2:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  btn:         { width: "100%", background: "#0A2540", border: "none", borderRadius: 8, padding: "14px 0", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8 },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  errMsg:      { fontSize: 12, color: "#DC2626", marginTop: 4 },
  successCard: { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: 48, textAlign: "center", maxWidth: 440, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  checkmark:   { fontSize: 48, color: "#16A34A", marginBottom: 16 },
  succTitle:   { fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#0F172A" },
  succSub:     { fontSize: 14, color: "#64748B", margin: 0, lineHeight: 1.6 },
};

function StepBar({ current }) {
  return (
    <div style={{ display: "flex", gap: 0, marginBottom: 8 }}>
      {STEPS.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            {i < STEPS.length - 1 && (
              <div style={{ position: "absolute", top: 14, left: "50%", width: "100%", height: 2, background: done ? "#2563EB" : "#E5E7EB", zIndex: 0 }} />
            )}
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "#2563EB" : active ? "#0A2540" : "#E5E7EB", color: done || active ? "#fff" : "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, zIndex: 1, position: "relative" }}>
              {done ? "✓" : num}
            </div>
            <div style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? "#0A2540" : done ? "#2563EB" : "#94A3B8", marginTop: 6, textAlign: "center" }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }) {
  return <div><label style={S.label}>{label}</label>{children}</div>;
}

export default function NewHirePortal({ token }) {
  const [employee, setEmployee]   = useState(null);
  const [step, setStep]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [complete, setComplete]   = useState(false);
  const [docId, setDocId]         = useState(null);
  const [validationErr, setValidationErr] = useState("");

  const [w4, setW4] = useState({
    filing_status: "single", multiple_jobs: false,
    dependents: "", other_income: "", deductions: "", extra_withholding: "",
    signature: "", date: TODAY,
  });

  const [dd, setDd] = useState({
    bank_name: "", account_type: "checking",
    routing_number: "", account_number: "", confirm_account_number: "",
    signature: "", date: TODAY,
  });

  const [i9, setI9] = useState({
    other_last_names: "", address: "", city: "", state: "", zip: "",
    dob: "", ssn: "", email: "", phone: "", attestation: "citizen",
    signature: "", date: TODAY,
  });

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from("employees").select("*").eq("onboarding_token", token).single();
      if (err || !data) { setError("Invalid or expired onboarding link."); setLoading(false); return; }
      setEmployee(data);
      setI9(prev => ({ ...prev, email: data.email || "" }));
      const { data: existing } = await supabase
        .from("employee_onboarding_docs").select("id, status").eq("employee_id", data.id).maybeSingle();
      if (existing) {
        setDocId(existing.id);
        if (existing.status === "complete") setComplete(true);
      }
      setLoading(false);
    }
    if (token) load();
  }, [token]);

  async function submitW4() {
    setValidationErr("");
    if (!w4.signature.trim()) { setValidationErr("Signature is required."); return; }
    setSaving(true);
    const payload = {
      employee_id: employee.id,
      organization_id: employee.organization_id,
      w4_filing_status: w4.filing_status,
      w4_multiple_jobs: w4.multiple_jobs,
      w4_dependents: parseFloat(w4.dependents) || 0,
      w4_other_income: parseFloat(w4.other_income) || 0,
      w4_deductions: parseFloat(w4.deductions) || 0,
      w4_extra_withholding: parseFloat(w4.extra_withholding) || 0,
      w4_signed_at: new Date().toISOString(),
      status: "partial",
    };
    let id = docId;
    if (!id) {
      const { data } = await supabase.from("employee_onboarding_docs").insert(payload).select("id").single();
      id = data?.id;
      setDocId(id);
    } else {
      await supabase.from("employee_onboarding_docs").update(payload).eq("id", id);
    }
    await supabase.from("required_documents")
      .update({ status: "verified", submitted_at: new Date().toISOString() })
      .eq("employee_id", employee.id).ilike("document_name", "%W-4%");
    setSaving(false);
    setStep(2);
  }

  async function submitDD() {
    setValidationErr("");
    if (!dd.bank_name.trim()) { setValidationErr("Bank name is required."); return; }
    if (dd.routing_number.length !== 9 || !/^\d{9}$/.test(dd.routing_number)) { setValidationErr("Routing number must be exactly 9 digits."); return; }
    if (!dd.account_number.trim()) { setValidationErr("Account number is required."); return; }
    if (dd.account_number !== dd.confirm_account_number) { setValidationErr("Account numbers do not match."); return; }
    if (!dd.signature.trim()) { setValidationErr("Signature is required."); return; }
    setSaving(true);
    await supabase.from("employee_onboarding_docs").update({
      dd_bank_name: dd.bank_name,
      dd_account_type: dd.account_type,
      dd_routing_number: dd.routing_number,
      dd_account_number: dd.account_number,
      dd_signed_at: new Date().toISOString(),
    }).eq("id", docId);
    await supabase.from("required_documents")
      .update({ status: "verified", submitted_at: new Date().toISOString() })
      .eq("employee_id", employee.id).ilike("document_name", "%Direct Deposit%");
    setSaving(false);
    setStep(3);
  }

  async function submitI9() {
    setValidationErr("");
    if (!i9.address.trim()) { setValidationErr("Address is required."); return; }
    if (!i9.dob) { setValidationErr("Date of birth is required."); return; }
    if (!i9.ssn.trim()) { setValidationErr("Social Security Number is required."); return; }
    if (!i9.attestation) { setValidationErr("Attestation selection is required."); return; }
    if (!i9.signature.trim()) { setValidationErr("Signature is required."); return; }
    setSaving(true);
    await supabase.from("employee_onboarding_docs").update({
      i9_other_last_names: i9.other_last_names,
      i9_address: i9.address,
      i9_city: i9.city,
      i9_state: i9.state,
      i9_zip: i9.zip,
      i9_dob: i9.dob,
      i9_ssn_last4: i9.ssn.replace(/\D/g, "").slice(-4),
      i9_email: i9.email,
      i9_phone: i9.phone,
      i9_attestation: i9.attestation,
      i9_signed_at: new Date().toISOString(),
      status: "complete",
    }).eq("id", docId);
    await supabase.from("required_documents")
      .update({ status: "verified", submitted_at: new Date().toISOString() })
      .eq("employee_id", employee.id).ilike("document_name", "%I-9%");
    setSaving(false);
    setComplete(true);
  }

  if (loading) return <div style={S.center}><p style={{ color: "#64748B" }}>Loading your onboarding portal…</p></div>;
  if (error)   return <div style={S.center}><p style={{ color: "#DC2626" }}>{error}</p></div>;
  if (complete) return (
    <div style={S.center}>
      <div style={S.successCard}>
        <div style={S.checkmark}>✓</div>
        <h2 style={S.succTitle}>Documents Complete!</h2>
        <p style={S.succSub}>
          Thanks, {employee?.full_name?.split(" ")[0]}. Your W-4, Direct Deposit, and I-9 have been submitted.<br /><br />
          Your People team will be in touch with next steps. Welcome to QumulusAI!
        </p>
      </div>
    </div>
  );

  return (
    <div style={S.shell}>
      <div style={S.header}>
        <div>
          <h1 style={S.wordmark}>Qumulus<span style={S.ai}>AI</span></h1>
          <p style={S.subtitle}>New Hire Document Portal</p>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 13, color: "#64748B" }}>
          Welcome, <strong style={{ color: "#0A2540" }}>{employee?.full_name}</strong> · {employee?.role_title}
        </div>
      </div>

      <div style={S.content}>
        <div style={S.card}>
          <StepBar current={step} />
        </div>

        {/* ── STEP 1: W-4 ── */}
        {step === 1 && (
          <div style={S.card}>
            <h2 style={S.cardTitle}>W-4 Federal Tax Withholding</h2>
            <p style={S.cardSub}>Complete your federal income tax withholding election. This determines how much federal tax is withheld from each paycheck.</p>

            <Field label="Legal Name">
              <input style={{ ...S.input, background: "#F1F5F9", color: "#64748B" }} value={employee?.full_name || ""} readOnly />
            </Field>

            <Field label="Filing Status">
              <select style={S.select} value={w4.filing_status} onChange={e => setW4(p => ({ ...p, filing_status: e.target.value }))}>
                <option value="single">Single or Married Filing Separately</option>
                <option value="married_jointly">Married Filing Jointly</option>
                <option value="head_of_household">Head of Household</option>
              </select>
            </Field>

            <div style={S.checkRow}>
              <input type="checkbox" id="multi" checked={w4.multiple_jobs} onChange={e => setW4(p => ({ ...p, multiple_jobs: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer" }} />
              <label htmlFor="multi" style={S.checkLabel}>Step 2: Multiple jobs or spouse also works</label>
            </div>

            <div style={S.row2}>
              <Field label="Step 3: Claim Dependents ($)">
                <input style={S.input} type="number" min="0" placeholder="0" value={w4.dependents} onChange={e => setW4(p => ({ ...p, dependents: e.target.value }))} />
              </Field>
              <Field label="Step 4a: Other Income Not from Jobs ($)">
                <input style={S.input} type="number" min="0" placeholder="0" value={w4.other_income} onChange={e => setW4(p => ({ ...p, other_income: e.target.value }))} />
              </Field>
              <Field label="Step 4b: Deductions ($)">
                <input style={S.input} type="number" min="0" placeholder="0" value={w4.deductions} onChange={e => setW4(p => ({ ...p, deductions: e.target.value }))} />
              </Field>
              <Field label="Step 4c: Extra Withholding per Pay Period ($)">
                <input style={S.input} type="number" min="0" placeholder="0" value={w4.extra_withholding} onChange={e => setW4(p => ({ ...p, extra_withholding: e.target.value }))} />
              </Field>
            </div>

            <p style={S.signNote}>Step 5 — Employee Signature. Under penalties of perjury, I declare that this certificate is accurate.</p>
            <input style={S.signInput} placeholder="Type your full legal name to sign" value={w4.signature} onChange={e => setW4(p => ({ ...p, signature: e.target.value }))} />
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#64748B" }}>Date:</span>
              <input style={{ ...S.input, width: "auto" }} type="date" value={w4.date} onChange={e => setW4(p => ({ ...p, date: e.target.value }))} />
            </div>
            {validationErr && <p style={S.errMsg}>{validationErr}</p>}
            <button style={{ ...S.btn, ...(saving ? S.btnDisabled : {}) }} onClick={submitW4} disabled={saving}>
              {saving ? "Saving…" : "Save & Continue →"}
            </button>
          </div>
        )}

        {/* ── STEP 2: DIRECT DEPOSIT ── */}
        {step === 2 && (
          <div style={S.card}>
            <h2 style={S.cardTitle}>Direct Deposit Authorization</h2>
            <p style={S.cardSub}>Authorize QumulusAI to deposit your pay directly to your bank account. 100% of net pay will be deposited to this account.</p>

            <Field label="Bank Name">
              <input style={S.input} placeholder="e.g. Chase, Wells Fargo, Bank of America" value={dd.bank_name} onChange={e => setDd(p => ({ ...p, bank_name: e.target.value }))} />
            </Field>

            <Field label="Account Type">
              <select style={S.select} value={dd.account_type} onChange={e => setDd(p => ({ ...p, account_type: e.target.value }))}>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </Field>

            <Field label="Routing Number (9 digits)">
              <input style={S.input} placeholder="123456789" maxLength={9} value={dd.routing_number}
                onChange={e => setDd(p => ({ ...p, routing_number: e.target.value.replace(/\D/g, "").slice(0, 9) }))} />
              {dd.routing_number.length > 0 && dd.routing_number.length !== 9 && (
                <p style={S.errMsg}>Must be exactly 9 digits</p>
              )}
            </Field>

            <div style={S.row2}>
              <Field label="Account Number">
                <input style={S.input} type="password" placeholder="Account number" value={dd.account_number} onChange={e => setDd(p => ({ ...p, account_number: e.target.value }))} />
              </Field>
              <Field label="Confirm Account Number">
                <input style={S.input} type="password" placeholder="Re-enter account number" value={dd.confirm_account_number} onChange={e => setDd(p => ({ ...p, confirm_account_number: e.target.value }))} />
                {dd.confirm_account_number && dd.account_number !== dd.confirm_account_number && (
                  <p style={S.errMsg}>Account numbers do not match</p>
                )}
              </Field>
            </div>

            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", marginTop: 16, fontSize: 13, color: "#1D4ED8" }}>
              100% of net pay will be deposited to this account each pay period.
            </div>

            <p style={S.signNote}>By signing, I authorize QumulusAI to initiate electronic deposits to the account above.</p>
            <input style={S.signInput} placeholder="Type your full legal name to authorize" value={dd.signature} onChange={e => setDd(p => ({ ...p, signature: e.target.value }))} />
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#64748B" }}>Date:</span>
              <input style={{ ...S.input, width: "auto" }} type="date" value={dd.date} onChange={e => setDd(p => ({ ...p, date: e.target.value }))} />
            </div>
            {validationErr && <p style={S.errMsg}>{validationErr}</p>}
            <button style={{ ...S.btn, ...(saving ? S.btnDisabled : {}) }} onClick={submitDD} disabled={saving}>
              {saving ? "Saving…" : "Save & Continue →"}
            </button>
          </div>
        )}

        {/* ── STEP 3: I-9 ── */}
        {step === 3 && (
          <div style={S.card}>
            <h2 style={S.cardTitle}>I-9 Employment Eligibility Verification</h2>
            <p style={S.cardSub}>Section 1 — Employee Information and Attestation. Must be completed on or before your first day of employment.</p>

            <div style={S.row2}>
              <Field label="Legal Name">
                <input style={{ ...S.input, background: "#F1F5F9", color: "#64748B" }} value={employee?.full_name || ""} readOnly />
              </Field>
              <Field label="Other Last Names Used (if any)">
                <input style={S.input} placeholder="N/A if none" value={i9.other_last_names} onChange={e => setI9(p => ({ ...p, other_last_names: e.target.value }))} />
              </Field>
            </div>

            <Field label="Street Address">
              <input style={S.input} placeholder="123 Main St, Apt 4B" value={i9.address} onChange={e => setI9(p => ({ ...p, address: e.target.value }))} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 }}>
              <Field label="City">
                <input style={S.input} placeholder="Atlanta" value={i9.city} onChange={e => setI9(p => ({ ...p, city: e.target.value }))} />
              </Field>
              <Field label="State">
                <input style={S.input} placeholder="GA" maxLength={2} value={i9.state} onChange={e => setI9(p => ({ ...p, state: e.target.value.toUpperCase() }))} />
              </Field>
              <Field label="ZIP Code">
                <input style={S.input} placeholder="30301" maxLength={5} value={i9.zip} onChange={e => setI9(p => ({ ...p, zip: e.target.value.replace(/\D/g, "").slice(0, 5) }))} />
              </Field>
            </div>

            <div style={S.row2}>
              <Field label="Date of Birth">
                <input style={S.input} type="date" value={i9.dob} onChange={e => setI9(p => ({ ...p, dob: e.target.value }))} />
              </Field>
              <Field label="U.S. Social Security Number">
                <input style={S.input} placeholder="XXX-XX-XXXX" value={i9.ssn}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 9);
                    const fmt = v.length > 5 ? `${v.slice(0,3)}-${v.slice(3,5)}-${v.slice(5)}` : v.length > 3 ? `${v.slice(0,3)}-${v.slice(3)}` : v;
                    setI9(p => ({ ...p, ssn: fmt }));
                  }} />
              </Field>
              <Field label="Email Address">
                <input style={S.input} type="email" value={i9.email} onChange={e => setI9(p => ({ ...p, email: e.target.value }))} />
              </Field>
              <Field label="Phone Number">
                <input style={S.input} placeholder="(404) 555-0100" value={i9.phone} onChange={e => setI9(p => ({ ...p, phone: e.target.value }))} />
              </Field>
            </div>

            <Field label="Attestation — I attest, under penalty of perjury, that I am (select one):">
              <select style={S.select} value={i9.attestation} onChange={e => setI9(p => ({ ...p, attestation: e.target.value }))}>
                <option value="citizen">A citizen of the United States</option>
                <option value="noncitizen_national">A noncitizen national of the United States</option>
                <option value="lawful_permanent_resident">A lawful permanent resident</option>
                <option value="alien_authorized">An alien authorized to work</option>
              </select>
            </Field>

            <p style={S.signNote}>Signature of Employee — I attest, under penalty of perjury, that the information provided is true and correct.</p>
            <input style={S.signInput} placeholder="Type your full legal name to sign" value={i9.signature} onChange={e => setI9(p => ({ ...p, signature: e.target.value }))} />
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#64748B" }}>Date:</span>
              <input style={{ ...S.input, width: "auto" }} type="date" value={i9.date} onChange={e => setI9(p => ({ ...p, date: e.target.value }))} />
            </div>
            {validationErr && <p style={S.errMsg}>{validationErr}</p>}
            <button style={{ ...S.btn, ...(saving ? S.btnDisabled : {}) }} onClick={submitI9} disabled={saving}>
              {saving ? "Submitting…" : "Submit All Documents ✓"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
