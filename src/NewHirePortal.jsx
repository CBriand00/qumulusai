import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const TODAY = new Date().toISOString().slice(0, 10);
const STEPS = ["W-4 Tax Withholding", "Direct Deposit", "I-9 Eligibility"];

const S = {
  shell:     { minHeight: "100vh", background: "#F7F8FA", color: "#0F172A", fontFamily: "'Inter', -apple-system, sans-serif" },
  center:    { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F8FA", fontFamily: "'Inter', -apple-system, sans-serif" },
  header:    { padding: "24px 32px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 16, background: "#fff" },
  wordmark:  { fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: "#0A2540" },
  ai:        { color: "#2563EB" },
  subtitle:  { fontSize: 13, color: "#64748B", margin: 0 },
  content:   { maxWidth: 680, margin: "0 auto", padding: "40px 32px", display: "flex", flexDirection: "column", gap: 24 },
  card:      { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  cardTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "#0F172A" },
  cardSub:   { fontSize: 13, color: "#64748B", margin: "0 0 24px", lineHeight: 1.6 },
  label:     { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, marginTop: 16 },
  input:     { width: "100%", boxSizing: "border-box", background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 12px", color: "#0F172A", fontSize: 14, outline: "none", fontFamily: "inherit" },
  inputRo:   { width: "100%", boxSizing: "border-box", background: "#F1F5F9", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 12px", color: "#64748B", fontSize: 14, outline: "none", fontFamily: "inherit" },
  select:    { width: "100%", boxSizing: "border-box", background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 12px", color: "#0F172A", fontSize: 14, outline: "none", cursor: "pointer", fontFamily: "inherit" },
  checkRow:  { display: "flex", alignItems: "center", gap: 10, marginTop: 16 },
  row2:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  divider:   { borderTop: "1px solid #F1F5F9", margin: "20px 0 0", paddingTop: 20 },
  signNote:  { fontSize: 13, color: "#64748B", margin: "0 0 8px" },
  signInput: { width: "100%", boxSizing: "border-box", background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px 14px", color: "#0F172A", fontSize: 16, fontStyle: "italic", outline: "none", marginBottom: 12, fontFamily: "inherit" },
  btn:       { width: "100%", background: "#0A2540", border: "none", borderRadius: 8, padding: "14px 0", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8, fontFamily: "inherit" },
  errMsg:    { fontSize: 12, color: "#DC2626", marginTop: 6 },
  infoBox:   { background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", marginTop: 16, fontSize: 13, color: "#1D4ED8" },
  succCard:  { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: 48, textAlign: "center", maxWidth: 440, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  checkmark: { fontSize: 48, color: "#16A34A", marginBottom: 16 },
  succTitle: { fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#0F172A" },
  succSub:   { fontSize: 14, color: "#64748B", margin: 0, lineHeight: 1.7 },
};

function StepBar({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
      {STEPS.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            {i < STEPS.length - 1 && (
              <div style={{ position: "absolute", top: 13, left: "50%", width: "100%", height: 2, background: done ? "#2563EB" : "#E5E7EB", zIndex: 0 }} />
            )}
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "#2563EB" : active ? "#0A2540" : "#E5E7EB", color: (done || active) ? "#fff" : "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, zIndex: 1, position: "relative", flexShrink: 0 }}>
              {done ? "✓" : num}
            </div>
            <div style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? "#0A2540" : done ? "#2563EB" : "#94A3B8", marginTop: 6, textAlign: "center", lineHeight: 1.3 }}>{label}</div>
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
  const [doc, setDoc]         = useState(null);
  const [employee, setEmployee] = useState(null);
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [complete, setComplete] = useState(false);
  const [valErr, setValErr]   = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const [w4, setW4] = useState({
    filing_status: "single", multiple_jobs: false,
    dependents: "", other_income: "", deductions: "", extra_withholding: "",
    signature: "", date: TODAY,
  });
  const [dd, setDd] = useState({
    bank_name: "", account_type: "checking",
    routing_number: "", account_number: "", confirm_account: "",
    signature: "", date: TODAY,
  });
  const [i9, setI9] = useState({
    other_names: "", address: "", city: "", state: "", zip: "",
    dob: "", ssn: "", email: "", phone: "", attestation: "citizen",
    signature: "", date: TODAY,
  });

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from("employee_onboarding_docs")
        .select("*, employees(*)")
        .eq("onboarding_token", token)
        .single();
      if (err || !data) { setError("Invalid or expired onboarding link."); setLoading(false); return; }
      setDoc(data);
      setEmployee(data.employees);
      if (data.status === "complete") setComplete(true);
      if (data.employees?.email) setI9(p => ({ ...p, email: data.employees.email }));
      setLoading(false);
    }
    if (token) load();
  }, [token]);

  async function saveW4() {
    setValErr("");
    if (!w4.signature.trim()) { setValErr("Signature is required."); return; }
    setSaving(true);
    await supabase.from("employee_onboarding_docs").update({
      w4_filing_status: w4.filing_status,
      w4_multiple_jobs: w4.multiple_jobs,
      w4_dependents: parseFloat(w4.dependents) || 0,
      w4_other_income: parseFloat(w4.other_income) || 0,
      w4_deductions: parseFloat(w4.deductions) || 0,
      w4_extra_withholding: parseFloat(w4.extra_withholding) || 0,
      w4_signature: w4.signature,
      w4_signed_at: new Date().toISOString(),
      status: "partial",
    }).eq("id", doc.id);
    await supabase.from("required_documents")
      .update({ status: "verified", submitted_at: new Date().toISOString() })
      .eq("employee_id", employee.id).ilike("document_name", "%W-4%");
    setSaving(false);
    setStep(2);
  }

  async function saveDD() {
    setValErr("");
    if (!dd.bank_name.trim()) { setValErr("Bank name is required."); return; }
    if (!/^\d{9}$/.test(dd.routing_number)) { setValErr("Routing number must be exactly 9 digits."); return; }
    if (!dd.account_number.trim()) { setValErr("Account number is required."); return; }
    if (dd.account_number !== dd.confirm_account) { setValErr("Account numbers do not match."); return; }
    if (!dd.signature.trim()) { setValErr("Signature is required."); return; }
    setSaving(true);
    await supabase.from("employee_onboarding_docs").update({
      dd_bank_name: dd.bank_name,
      dd_account_type: dd.account_type,
      dd_routing_number: dd.routing_number,
      dd_account_number: dd.account_number,
      dd_signature: dd.signature,
      dd_signed_at: new Date().toISOString(),
    }).eq("id", doc.id);
    await supabase.from("required_documents")
      .update({ status: "verified", submitted_at: new Date().toISOString() })
      .eq("employee_id", employee.id).ilike("document_name", "%Direct Deposit%");
    setSaving(false);
    setStep(3);
  }

  async function triggerOnboardingChannel({ doc, employee, w4, dd }) {
    const firstName = employee.full_name?.split(" ")[0]?.toLowerCase() || "newhire";
    const startDate = employee.start_date || new Date().toISOString().slice(0, 10);
    const channel = `onboarding-${firstName}-${startDate}`;

    // Fetch offer data for salary/bonus info
    const { data: offerData } = await supabase
      .from("offers")
      .select("salary, bonus, sign_on_bonus, rsu")
      .eq("application_id", employee.application_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Next pay date (first of the month after start)
    const start = new Date(startDate);
    const nextPay = new Date(start.getFullYear(), start.getMonth() + 1, 1)
      .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const itDeadline = new Date(new Date(startDate).getTime() - 3 * 86400000)
      .toLocaleDateString("en-US", { month: "long", day: "numeric" });

    const equipment = () => {
      const role = (employee.role_title || "").toLowerCase();
      if (role.includes("engineer") || role.includes("infra") || role.includes("data center"))
        return "□ MacBook Pro 16\" M3 Max\n    □ 4K external monitor\n    □ YubiKey security key\n    □ Server rack access badge";
      if (role.includes("sales") || role.includes("marketing"))
        return "□ MacBook Pro 14\" M3\n    □ External monitor\n    □ USB-C hub";
      return "□ MacBook Pro 14\" M3\n    □ External monitor\n    □ Standard peripherals";
    };

    const post = (sender_name, content) =>
      supabase.from("messages").insert({ channel, sender_name, content });

    await post(
      "QumulusAI People & Culture",
      `🎉 Welcome ${employee.full_name} to QumulusAI!\n\nRole: ${employee.role_title} | Start: ${startDate}\n\nAll onboarding documents have been completed ✅\n\n@hiring-manager @it-team @payroll — please see your action items below.`
    );

    await post(
      "IT Provisioning Bot",
      `💻 IT Setup Required for ${employee.full_name} — starting ${startDate}\n\n    Equipment:\n    ${equipment()}\n\n    Software:\n    □ Google Workspace: ${employee.email}\n    □ Slack invite\n    □ Notion access\n    □ 1Password\n    □ Zoom Pro\n    □ Role-specific tools\n\n    ⏰ Please confirm by ${itDeadline}\n    React ✅ when complete.`
    );

    const payLines = [
      offerData?.salary    ? `Base Salary: $${offerData.salary}` : null,
      offerData?.bonus     ? `Annual Bonus: $${offerData.bonus}` : null,
      offerData?.sign_on_bonus ? `Sign-On Bonus: $${offerData.sign_on_bonus} — due within 30 days` : null,
      offerData?.rsu       ? `RSU Grant: ${offerData.rsu}` : null,
    ].filter(Boolean).join("\n    ");

    await post(
      "Payroll Bot",
      `💰 Payroll Setup Required for ${employee.full_name}\n\n    ${payLines || "Compensation details in offer letter"}\n\n    W-4 Status: ✅ On file\n    Direct Deposit: ✅ On file\n    Filing Status: ${w4.filing_status || "—"}\n\n    First paycheck: ${nextPay}\n    React ✅ when complete.`
    );

    await post(
      "People & Culture Bot",
      `👋 Manager Checklist for ${employee.full_name}'s First Day\n\n    Before ${startDate}:\n    □ Schedule Day 1 welcome 1:1\n    □ Prepare 30-60-90 day plan\n    □ Send team introduction email\n    □ Review QumulusAI onboarding guide\n\n    Day 1:\n    □ Morning coffee/welcome chat\n    □ Team introductions\n    □ Share current priorities\n    □ Set up recurring 1:1 cadence\n\n    React ✅ when complete.`
    );

    // AI-generated first day agenda
    try {
      const { data: aiData } = await supabase.functions.invoke("ai-query", {
        body: {
          max_tokens: 600,
          system: "You are QumulusAI's AI Chief of Staff. Write a warm, practical first-day agenda for a new hire. Be specific to their role. Format with clear time blocks.",
          messages: [{ role: "user", content: `Create a first-day agenda for ${employee.full_name}, a new ${employee.role_title} starting on ${startDate} at QumulusAI (a fast-growing GPU AI infrastructure company in Atlanta, GA).` }],
        },
      });
      const agenda = aiData?.content?.[0]?.text || "First day agenda to be shared by your manager.";
      await post("QumulusAI Chief of Staff", `📋 Personalized First Day Agenda — ${employee.full_name}\n\n${agenda}`);
    } catch (_) {
      await post("QumulusAI Chief of Staff", `📋 First Day Agenda for ${employee.full_name}\n\nYour manager will share your personalized Day 1 schedule shortly. Welcome to the team!`);
    }
  }

  async function saveI9() {
    setValErr("");
    if (!i9.address.trim()) { setValErr("Address is required."); return; }
    if (!i9.dob) { setValErr("Date of birth is required."); return; }
    if (!i9.ssn.trim()) { setValErr("SSN is required."); return; }
    if (!i9.signature.trim()) { setValErr("Signature is required."); return; }
    setSaving(true);
    await supabase.from("employee_onboarding_docs").update({
      i9_other_names: i9.other_names,
      i9_address: i9.address,
      i9_city: i9.city,
      i9_state: i9.state,
      i9_zip: i9.zip,
      i9_dob: i9.dob,
      i9_ssn_last4: i9.ssn.replace(/\D/g, "").slice(-4),
      i9_email: i9.email,
      i9_phone: i9.phone,
      i9_attestation: i9.attestation,
      i9_signature: i9.signature,
      i9_signed_at: new Date().toISOString(),
      status: "complete",
    }).eq("id", doc.id);
    await supabase.from("required_documents")
      .update({ status: "verified", submitted_at: new Date().toISOString() })
      .eq("employee_id", employee.id).ilike("document_name", "%I-9%");
    // Fire onboarding channel automation (non-blocking)
    triggerOnboardingChannel({ doc, employee, w4, dd }).catch(console.error);
    setSaving(false);
    setComplete(true);
  }

  if (loading) return <div style={S.center}><p style={{ color: "#64748B" }}>Loading your onboarding portal…</p></div>;
  if (error)   return <div style={S.center}><p style={{ color: "#DC2626" }}>{error}</p></div>;
  if (complete) return (
    <div style={S.center}>
      <div style={S.succCard}>
        <div style={S.checkmark}>✓</div>
        <h2 style={S.succTitle}>Documents Complete!</h2>
        <p style={S.succSub}>
          Thanks, <strong>{employee?.full_name?.split(" ")[0]}</strong>. Your W-4, Direct Deposit, and I-9 have been submitted successfully.<br /><br />
          Your HR team will be in touch with next steps. Welcome to QumulusAI!
        </p>
      </div>
    </div>
  );

  const firstName = employee?.full_name?.split(" ")[0] || "";

  return (
    <div style={S.shell}>
      <div style={{...S.header, padding: isMobile ? "14px 16px" : "24px 32px", flexWrap: "wrap", gap: 8}}>
        <div>
          <h1 style={S.wordmark}>Qumulus<span style={S.ai}>AI</span></h1>
          <p style={S.subtitle}>New Hire Document Portal</p>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 13, color: "#64748B" }}>
          Welcome, <strong style={{ color: "#0A2540" }}>{employee?.full_name}</strong>
        </div>
      </div>

      <div style={{...S.content, padding: isMobile ? "16px" : "40px 32px"}}>
        <div style={{...S.card, padding: isMobile ? 16 : 28}}><StepBar current={step} /></div>

        {/* ── STEP 1: W-4 ── */}
        {step === 1 && (
          <div style={{...S.card, padding: isMobile ? 16 : 28}}>
            <h2 style={S.cardTitle}>Step 1 of 3 — W-4 Federal Tax Withholding</h2>
            <p style={S.cardSub}>Tell QumulusAI how much federal income tax to withhold from each paycheck. You can update this any time through People & Culture.</p>

            <Field label="Legal Name"><input style={S.inputRo} value={employee?.full_name || ""} readOnly /></Field>

            <Field label="Filing Status">
              <select style={S.select} value={w4.filing_status} onChange={e => setW4(p => ({ ...p, filing_status: e.target.value }))}>
                <option value="single">Single or Married Filing Separately</option>
                <option value="married_jointly">Married Filing Jointly or Qualifying Surviving Spouse</option>
                <option value="head_of_household">Head of Household</option>
              </select>
            </Field>

            <div style={S.checkRow}>
              <input type="checkbox" id="multijobs" checked={w4.multiple_jobs}
                onChange={e => setW4(p => ({ ...p, multiple_jobs: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#0A2540" }} />
              <label htmlFor="multijobs" style={{ fontSize: 14, color: "#374151", cursor: "pointer" }}>
                Step 2: Multiple jobs or spouse also works
              </label>
            </div>

            <div style={{...S.row2, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr"}}>
              <Field label="Step 3 — Claim Dependents ($)">
                <input style={S.input} type="number" min="0" placeholder="0.00" value={w4.dependents}
                  onChange={e => setW4(p => ({ ...p, dependents: e.target.value }))} />
              </Field>
              <Field label="Step 4a — Other Income ($)">
                <input style={S.input} type="number" min="0" placeholder="0.00" value={w4.other_income}
                  onChange={e => setW4(p => ({ ...p, other_income: e.target.value }))} />
              </Field>
              <Field label="Step 4b — Deductions ($)">
                <input style={S.input} type="number" min="0" placeholder="0.00" value={w4.deductions}
                  onChange={e => setW4(p => ({ ...p, deductions: e.target.value }))} />
              </Field>
              <Field label="Step 4c — Extra Withholding per Pay Period ($)">
                <input style={S.input} type="number" min="0" placeholder="0.00" value={w4.extra_withholding}
                  onChange={e => setW4(p => ({ ...p, extra_withholding: e.target.value }))} />
              </Field>
            </div>

            <div style={S.divider}>
              <p style={S.signNote}>Step 5 — Signature. Under penalties of perjury, I declare this certificate is accurate to the best of my knowledge.</p>
              <input style={S.signInput} placeholder={`Type your full legal name to sign (${employee?.full_name})`}
                value={w4.signature} onChange={e => setW4(p => ({ ...p, signature: e.target.value }))} />
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#64748B", whiteSpace: "nowrap" }}>Date signed:</span>
                <input style={{ ...S.input, width: "auto" }} type="date" value={w4.date}
                  onChange={e => setW4(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            {valErr && <p style={S.errMsg}>{valErr}</p>}
            <button style={{ ...S.btn, opacity: saving ? 0.6 : 1, cursor: saving ? "default" : "pointer" }}
              onClick={saveW4} disabled={saving}>
              {saving ? "Saving…" : "Save & Continue →"}
            </button>
          </div>
        )}

        {/* ── STEP 2: DIRECT DEPOSIT ── */}
        {step === 2 && (
          <div style={{...S.card, padding: isMobile ? 16 : 28}}>
            <h2 style={S.cardTitle}>Step 2 of 3 — Direct Deposit Authorization</h2>
            <p style={S.cardSub}>Authorize QumulusAI to deposit your net pay directly to your bank account each pay period.</p>

            <Field label="Bank Name">
              <input style={S.input} placeholder="e.g. Chase, Wells Fargo, Bank of America"
                value={dd.bank_name} onChange={e => setDd(p => ({ ...p, bank_name: e.target.value }))} />
            </Field>

            <Field label="Account Type">
              <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
                {["checking", "savings"].map(t => (
                  <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#374151", cursor: "pointer" }}>
                    <input type="radio" name="acct_type" value={t} checked={dd.account_type === t}
                      onChange={() => setDd(p => ({ ...p, account_type: t }))}
                      style={{ accentColor: "#0A2540" }} />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Routing Number (9 digits)">
              <input style={S.input} placeholder="123456789" maxLength={9}
                value={dd.routing_number}
                onChange={e => setDd(p => ({ ...p, routing_number: e.target.value.replace(/\D/g, "").slice(0, 9) }))} />
              {dd.routing_number.length > 0 && dd.routing_number.length !== 9 &&
                <p style={S.errMsg}>Must be exactly 9 digits ({dd.routing_number.length}/9)</p>}
            </Field>

            <div style={{...S.row2, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr"}}>
              <Field label="Account Number">
                <input style={S.input} type="password" placeholder="Account number"
                  value={dd.account_number} onChange={e => setDd(p => ({ ...p, account_number: e.target.value }))} />
              </Field>
              <Field label="Confirm Account Number">
                <input style={S.input} type="password" placeholder="Re-enter account number"
                  value={dd.confirm_account} onChange={e => setDd(p => ({ ...p, confirm_account: e.target.value }))} />
                {dd.confirm_account && dd.account_number !== dd.confirm_account &&
                  <p style={S.errMsg}>Account numbers do not match</p>}
              </Field>
            </div>

            <div style={S.infoBox}>100% of net pay will be deposited to this account each pay period.</div>

            <div style={S.divider}>
              <p style={S.signNote}>By signing below, I authorize QumulusAI to initiate electronic credit entries to the account listed above.</p>
              <input style={S.signInput} placeholder={`Type your full legal name to authorize (${employee?.full_name})`}
                value={dd.signature} onChange={e => setDd(p => ({ ...p, signature: e.target.value }))} />
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#64748B", whiteSpace: "nowrap" }}>Date signed:</span>
                <input style={{ ...S.input, width: "auto" }} type="date" value={dd.date}
                  onChange={e => setDd(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            {valErr && <p style={S.errMsg}>{valErr}</p>}
            <button style={{ ...S.btn, opacity: saving ? 0.6 : 1, cursor: saving ? "default" : "pointer" }}
              onClick={saveDD} disabled={saving}>
              {saving ? "Saving…" : "Save & Continue →"}
            </button>
          </div>
        )}

        {/* ── STEP 3: I-9 ── */}
        {step === 3 && (
          <div style={{...S.card, padding: isMobile ? 16 : 28}}>
            <h2 style={S.cardTitle}>Step 3 of 3 — I-9 Employment Eligibility Verification</h2>
            <p style={S.cardSub}>Section 1 — Employee Information and Attestation. Must be completed on or before your first day of employment.</p>

            <div style={{...S.row2, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr"}}>
              <Field label="Legal Name">
                <input style={S.inputRo} value={employee?.full_name || ""} readOnly />
              </Field>
              <Field label="Other Last Names Used (enter N/A if none)">
                <input style={S.input} placeholder="N/A"
                  value={i9.other_names} onChange={e => setI9(p => ({ ...p, other_names: e.target.value }))} />
              </Field>
            </div>

            <Field label="Street Address">
              <input style={S.input} placeholder="123 Main St, Apt 4B"
                value={i9.address} onChange={e => setI9(p => ({ ...p, address: e.target.value }))} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr", gap: 16 }}>
              <Field label="City">
                <input style={S.input} placeholder="Atlanta"
                  value={i9.city} onChange={e => setI9(p => ({ ...p, city: e.target.value }))} />
              </Field>
              <Field label="State">
                <input style={S.input} placeholder="GA" maxLength={2}
                  value={i9.state} onChange={e => setI9(p => ({ ...p, state: e.target.value.toUpperCase() }))} />
              </Field>
              <Field label="ZIP Code">
                <input style={S.input} placeholder="30301" maxLength={5}
                  value={i9.zip} onChange={e => setI9(p => ({ ...p, zip: e.target.value.replace(/\D/g, "").slice(0, 5) }))} />
              </Field>
            </div>

            <div style={{...S.row2, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr"}}>
              <Field label="Date of Birth">
                <input style={S.input} type="date" value={i9.dob}
                  onChange={e => setI9(p => ({ ...p, dob: e.target.value }))} />
              </Field>
              <Field label="Social Security Number (last 4 digits only)">
                <input style={S.input} placeholder="e.g. 1234" maxLength={4}
                  value={i9.ssn} onChange={e => setI9(p => ({ ...p, ssn: e.target.value.replace(/\D/g, "").slice(0, 4) }))} />
              </Field>
              <Field label="Email Address">
                <input style={S.input} type="email" value={i9.email}
                  onChange={e => setI9(p => ({ ...p, email: e.target.value }))} />
              </Field>
              <Field label="Phone Number">
                <input style={S.input} placeholder="(404) 555-0100" value={i9.phone}
                  onChange={e => setI9(p => ({ ...p, phone: e.target.value }))} />
              </Field>
            </div>

            <Field label="Attestation — I attest, under penalty of perjury, that I am:">
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                {[
                  { value: "citizen", label: "A citizen of the United States" },
                  { value: "noncitizen_national", label: "A noncitizen national of the United States" },
                  { value: "lawful_permanent_resident", label: "A lawful permanent resident" },
                  { value: "alien_authorized", label: "An alien authorized to work" },
                ].map(opt => (
                  <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#374151", cursor: "pointer" }}>
                    <input type="radio" name="attestation" value={opt.value}
                      checked={i9.attestation === opt.value}
                      onChange={() => setI9(p => ({ ...p, attestation: opt.value }))}
                      style={{ accentColor: "#0A2540" }} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </Field>

            <div style={S.divider}>
              <p style={S.signNote}>I attest, under penalty of perjury, that the information I have provided is true and correct.</p>
              <input style={S.signInput} placeholder={`Type your full legal name to sign (${employee?.full_name})`}
                value={i9.signature} onChange={e => setI9(p => ({ ...p, signature: e.target.value }))} />
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#64748B", whiteSpace: "nowrap" }}>Date signed:</span>
                <input style={{ ...S.input, width: "auto" }} type="date" value={i9.date}
                  onChange={e => setI9(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            {valErr && <p style={S.errMsg}>{valErr}</p>}
            <button style={{ ...S.btn, opacity: saving ? 0.6 : 1, cursor: saving ? "default" : "pointer" }}
              onClick={saveI9} disabled={saving}>
              {saving ? "Submitting…" : "Submit All Documents ✓"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
