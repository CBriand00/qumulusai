import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { useBreakpoint } from "./useBreakpoint";
import { brand } from "./brand";

// ── Design tokens (match App.jsx) ─────────────────────────────────────────────
const C = {
  bg:        "#F0F2F7",
  bgCard:    "#FFFFFF",
  sidebar:   "#080D1A",
  textDark:  "#0D1117",
  textMid:   "#3D4B5C",
  textMuted: "#7E8FA3",
  border:    "#DDE3ED",
  cyan:      "#00C2E0",
  blue:      "#2563EB",
  violet:    "#7C3AED",
  teal:      "#0D9488",
  amber:     "#D97706",
  rose:      "#DC2626",
  emerald:   "#059669",
  green:     "#16A34A",
};

const SUPABASE_URL = "https://oomdaguzvdheotrkqdxs.supabase.co";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt$(n) {
  if (n == null) return "—";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_STYLE = {
  draft:    { bg: "#7C3AED10", text: C.violet, label: "Draft" },
  review:   { bg: "#D9770610", text: C.amber,  label: "In Review" },
  approved: { bg: "#2563EB10", text: C.blue,   label: "Approved" },
  paid:     { bg: "#05966910", text: C.emerald,label: "Paid" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { bg: "#00000008", text: C.textMid, label: status };
  return (
    <span style={{ background: s.bg, color: s.text, borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "inline-block" }}>
      {s.label}
    </span>
  );
}

// ── Run Payroll Modal ─────────────────────────────────────────────────────────
function RunPayrollModal({ onClose, onSuccess }) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, today.getMonth() + 1, 0).getDate();

  const [form, setForm] = useState({
    pay_period_start: `${y}-${m}-01`,
    pay_period_end:   `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
    pay_date:         `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
  });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function handleRun() {
    if (!form.pay_period_start || !form.pay_period_end || !form.pay_date) {
      setError("All date fields are required.");
      return;
    }
    setRunning(true);
    setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("calculate-payroll", {
        body: form,
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      onSuccess(data);
    } catch (e) {
      setError(e.message || "Failed to run payroll.");
    }
    setRunning(false);
  }

  const field = (label, key, type = "date") => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        style={{ width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, color: C.textDark, fontFamily: "inherit", outline: "none" }}
      />
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.textDark, letterSpacing: "-0.02em" }}>Run Payroll</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Calculates gross, withholding, and net for all active employees</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: C.textMuted, cursor: "pointer", padding: 4 }}>✕</button>
        </div>

        {field("Pay Period Start", "pay_period_start")}
        {field("Pay Period End",   "pay_period_end")}
        {field("Pay Date",         "pay_date")}

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: C.rose, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 0", fontSize: 14, color: C.textMid, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={handleRun} disabled={running} style={{ flex: 2, background: C.teal, border: "none", borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 700, color: "#fff", cursor: running ? "default" : "pointer", opacity: running ? 0.7 : 1, fontFamily: "inherit" }}>
            {running ? "Calculating…" : "Calculate & Create Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pay Stubs Drawer ──────────────────────────────────────────────────────────
function PayStubsDrawer({ run, onClose }) {
  const [stubs, setStubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("pay_stubs")
        .select("*, employees(full_name, role_title)")
        .eq("payroll_run_id", run.id)
        .order("created_at");
      setStubs(data || []);
      setLoading(false);
    }
    load();
  }, [run.id]);

  const colW = isMobile ? 80 : 100;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 900, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ background: "#fff", width: isMobile ? "100%" : 680, height: "100%", display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.textDark, letterSpacing: "-0.02em" }}>
              Pay Stubs — {fmtDate(run.pay_period_start)} to {fmtDate(run.pay_period_end)}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
              Pay date {fmtDate(run.pay_date)} · {run.employee_count} employees · <StatusBadge status={run.status} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: C.textMuted, cursor: "pointer", padding: 4, flexShrink: 0 }}>✕</button>
        </div>

        {/* Summary bar */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {[
            { label: "Total Gross", value: fmt$(run.total_gross) },
            { label: "Total Tax",   value: fmt$(run.total_tax_withheld) },
            { label: "Total Net",   value: fmt$(run.total_net) },
          ].map((item, i) => (
            <div key={i} style={{ flex: 1, padding: "14px 20px", borderRight: i < 2 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.textDark }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Stubs table */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 14 }}>Loading pay stubs…</div>
          ) : stubs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 14 }}>No pay stubs found for this run.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Employee", "Gross", "Federal", "State", "SS", "Medicare", "Net"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: h === "Employee" ? "left" : "right", fontWeight: 700, fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stubs.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: C.textDark }}>{s.employees?.full_name || "—"}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{s.employees?.role_title || ""}</div>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: C.textDark, fontWeight: 600 }}>{fmt$(s.gross_pay)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: C.rose }}>{fmt$(s.federal_tax)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: C.rose }}>{fmt$(s.state_tax)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: C.textMid }}>{fmt$(s.social_security)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: C.textMid }}>{fmt$(s.medicare)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: C.emerald, fontWeight: 700 }}>{fmt$(s.net_pay)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#F0F2F7", borderTop: `2px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px", fontWeight: 800, color: C.textDark, fontSize: 12 }}>TOTALS</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: C.textDark }}>{fmt$(run.total_gross)}</td>
                  <td colSpan={3} style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: C.rose }}>
                    {fmt$(run.total_tax_withheld)} total tax
                  </td>
                  <td />
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: C.emerald }}>{fmt$(run.total_net)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── NACHA (ACH) file generation ───────────────────────────────────────────────
// Builds a bank-standard ACH credit file (PPD) from a run's pay stubs and the
// employees' direct-deposit details. Company/ODFI identifiers are demo values —
// replace with your bank's before uploading to a real bank portal.
const ACH = {
  odfiRouting: "061000104",        // originating bank (Truist ATL)
  companyName: "QUMULUSAI",
  companyId:   "1581234567",       // 1 + EIN (demo)
  destName:    "TRUIST BANK",
};

function achPad(s, len, right = false, ch = " ") {
  s = String(s ?? "").slice(0, len);
  return right ? s.padStart(len, ch) : s.padEnd(len, ch);
}

function buildAchFile(run, entries) {
  // entries: [{ name, routing, account, accountType, amountCents, empId }]
  const now = new Date();
  const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, "");
  const hhmm = now.toTimeString().slice(0, 5).replace(":", "");
  const effDate = (run.pay_date || now.toISOString().slice(0, 10)).slice(2).replace(/-/g, "");
  const lines = [];

  // File header
  lines.push(
    "101 " + achPad(ACH.odfiRouting, 9, true, "0") + achPad(ACH.companyId, 10, true, " ") +
    yymmdd + hhmm + "A" + "094" + "10" + "1" +
    achPad(ACH.destName, 23) + achPad(ACH.companyName, 23) + achPad("PAYROLL", 8)
  );
  // Batch header
  lines.push(
    "5220" + achPad(ACH.companyName, 16) + achPad("", 20) + achPad(ACH.companyId, 10) +
    "PPD" + achPad("PAYROLL", 10) + achPad(yymmdd, 6) + effDate + "   " + "1" +
    ACH.odfiRouting.slice(0, 8) + "0000001"
  );
  // Entries
  let hash = 0, totalCents = 0;
  entries.forEach((e, i) => {
    const rt = e.routing.replace(/\D/g, "").padStart(9, "0");
    hash += parseInt(rt.slice(0, 8), 10);
    totalCents += e.amountCents;
    const txn = e.accountType === "savings" ? "32" : "22";
    lines.push(
      "6" + txn + rt +
      achPad(e.account.replace(/\s/g, ""), 17) +
      achPad(e.amountCents, 10, true, "0") +
      achPad(e.empId, 15) +
      achPad(e.name.toUpperCase(), 22) + "  " + "0" +
      ACH.odfiRouting.slice(0, 8) + achPad(i + 1, 7, true, "0")
    );
  });
  const hash10 = String(hash).slice(-10).padStart(10, "0");
  // Batch control
  lines.push(
    "8220" + achPad(entries.length, 6, true, "0") + hash10 +
    achPad(0, 12, true, "0") + achPad(totalCents, 12, true, "0") +
    achPad(ACH.companyId, 10) + achPad("", 19) + achPad("", 6) +
    ACH.odfiRouting.slice(0, 8) + "0000001"
  );
  // File control
  const preBlock = lines.length + 1;
  const blockCount = Math.ceil(preBlock / 10);
  lines.push(
    "9" + achPad(1, 6, true, "0") + achPad(blockCount, 6, true, "0") +
    achPad(entries.length, 8, true, "0") + hash10 +
    achPad(0, 12, true, "0") + achPad(totalCents, 12, true, "0") + achPad("", 39)
  );
  // Pad to a full block of 10 lines
  while (lines.length % 10 !== 0) lines.push("9".repeat(94));
  return lines.map(l => achPad(l, 94)).join("\r\n");
}

// ── Tax Liability Report ──────────────────────────────────────────────────────
// Aggregates withheld + employer-side taxes per quarter so whoever files the
// 941 / GA G-7 has every line ready. The system does NOT file or remit.
const FUTA_RATE = 0.006, FUTA_BASE = 7000;      // after full state credit
const SUTA_RATE = 0.027, SUTA_BASE = 9500;      // GA new-employer rate
const round2 = n => Math.round(n * 100) / 100;

function TaxLiability({ showToast }) {
  const [stubs, setStubs] = useState(null);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    supabase.from("pay_stubs")
      .select("employee_id, gross_pay, federal_tax, state_tax, social_security, medicare, net_pay, pay_date, employees(full_name)")
      .not("payroll_run_id", "is", null)
      .order("pay_date")
      .then(({ data }) => setStubs(data || []));
  }, []);

  if (!stubs) return null;
  if (stubs.length === 0) return null;

  // Per-employee running gross (for FUTA/SUTA wage bases) + quarter buckets
  const ytdByEmp = {};
  const quarters = {};
  stubs.forEach(s => {
    const d = new Date(s.pay_date);
    const q = `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
    if (!quarters[q]) quarters[q] = { gross: 0, fed: 0, state: 0, ssEmp: 0, medEmp: 0, medErGross: 0, futa: 0, suta: 0, year: d.getFullYear(), qn: Math.floor(d.getMonth() / 3) + 1 };
    const Q = quarters[q];
    const gross = Number(s.gross_pay || 0);
    const prior = ytdByEmp[s.employee_id] || 0;
    Q.gross += gross;
    Q.fed   += Number(s.federal_tax || 0);
    Q.state += Number(s.state_tax || 0);
    Q.ssEmp += Number(s.social_security || 0);
    Q.medEmp+= Number(s.medicare || 0);
    Q.medErGross += gross;
    Q.futa  += Math.max(0, Math.min(FUTA_BASE - prior, gross)) * FUTA_RATE;
    Q.suta  += Math.max(0, Math.min(SUTA_BASE - prior, gross)) * SUTA_RATE;
    ytdByEmp[s.employee_id] = prior + gross;
  });

  const qKeys = Object.keys(quarters).sort().reverse();
  const DUE = { 1: "Apr 30", 2: "Jul 31", 3: "Oct 31", 4: "Jan 31" };

  function exportQuarter(qk) {
    const Q = quarters[qk];
    const ssEr = Q.ssEmp;                                   // employer matches employee SS
    const medEr = round2(Q.medErGross * 0.0145);            // employer Medicare (no addl 0.9%)
    const rows = [
      [brand.name + " — Quarterly Tax Liability Worksheet (941 / GA G-7 prep)", ""],
      ["Quarter", qk],
      ["", ""],
      ["Line", "Amount"],
      ["Total wages (941 line 2)", round2(Q.gross)],
      ["Federal income tax withheld (941 line 3)", round2(Q.fed)],
      ["Social Security tax — employee withheld", round2(Q.ssEmp)],
      ["Social Security tax — employer match", round2(ssEr)],
      ["Medicare tax — employee withheld (incl. addl)", round2(Q.medEmp)],
      ["Medicare tax — employer share (1.45%)", medEr],
      ["Total federal deposit due (income tax + all FICA)", round2(Q.fed + Q.ssEmp + ssEr + Q.medEmp + medEr)],
      ["", ""],
      ["Georgia income tax withheld (G-7)", round2(Q.state)],
      ["FUTA estimate (0.6% of first $7,000/employee)", round2(Q.futa)],
      ["GA SUTA estimate (2.7% of first $9,500/employee)", round2(Q.suta)],
      ["", ""],
      ["941 filing deadline", DUE[Q.qn]],
      ["Note", "Estimates for filing prep only. This system does not file or remit taxes."],
    ];
    const csv = "﻿" + rows.map(r => r.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${brand.name.replace(/s+/g,"")}_TaxLiability_${qk.replace(" ", "_")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Tax worksheet for ${qk} downloaded.`);
  }

  function exportW2() {
    const byEmp = {};
    stubs.forEach(s => {
      const k = s.employee_id;
      if (!byEmp[k]) byEmp[k] = { name: s.employees?.full_name || "Unknown", gross: 0, fed: 0, ss: 0, med: 0, state: 0 };
      byEmp[k].gross += Number(s.gross_pay || 0);
      byEmp[k].fed   += Number(s.federal_tax || 0);
      byEmp[k].ss    += Number(s.social_security || 0);
      byEmp[k].med   += Number(s.medicare || 0);
      byEmp[k].state += Number(s.state_tax || 0);
    });
    const header = ["Employee", "Box 1 Wages", "Box 2 Fed Income Tax", "Box 3 SS Wages", "Box 4 SS Tax", "Box 5 Medicare Wages", "Box 6 Medicare Tax", "Box 16 State Wages (GA)", "Box 17 State Income Tax (GA)"];
    const rows = Object.values(byEmp).map(e => [e.name, round2(e.gross), round2(e.fed), round2(Math.min(e.gross, 176100)), round2(e.ss), round2(e.gross), round2(e.med), round2(e.gross), round2(e.state)]);
    const csv = "﻿" + [header, ...rows].map(r => r.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${brand.name.replace(/s+/g,"")}_W2_Data_${new Date().getFullYear()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("W-2 wage data downloaded.");
  }

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, marginTop: 20, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>Tax Liability</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Withheld + employer-side taxes by quarter. Prep numbers for Form 941 / GA G-7 — filing happens at EFTPS &amp; GTC, not here.</div>
        </div>
        <button onClick={exportW2}
          style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, color: C.textMid, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
          ⬇ W-2 Data (YTD)
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              {["Quarter", "Wages", "Fed W/H", "FICA (EE+ER)", "GA W/H", "FUTA est.", "SUTA est.", "Total Liability", "941 Due", ""].map((h, hi) => (
                <th key={h + hi} style={{ padding: "10px 12px", textAlign: hi >= 1 && hi <= 7 ? "right" : "left", fontSize: 10.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {qKeys.map(qk => {
              const Q = quarters[qk];
              const ssEr = Q.ssEmp;
              const medEr = round2(Q.medErGross * 0.0145);
              const fica = round2(Q.ssEmp + ssEr + Q.medEmp + medEr);
              const total = round2(Q.fed + fica + Q.state + Q.futa + Q.suta);
              return (
                <tr key={qk} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "11px 12px", fontWeight: 700, color: C.textDark, fontSize: 13, whiteSpace: "nowrap" }}>{qk}</td>
                  <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 13, color: C.textDark, whiteSpace: "nowrap" }}>{fmt$(Q.gross)}</td>
                  <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 13, color: C.rose, whiteSpace: "nowrap" }}>{fmt$(Q.fed)}</td>
                  <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 13, color: C.rose, whiteSpace: "nowrap" }} title="Employee withheld + employer match">{fmt$(fica)}</td>
                  <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 13, color: C.rose, whiteSpace: "nowrap" }}>{fmt$(Q.state)}</td>
                  <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 13, color: C.amber, whiteSpace: "nowrap" }}>{fmt$(round2(Q.futa))}</td>
                  <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 13, color: C.amber, whiteSpace: "nowrap" }}>{fmt$(round2(Q.suta))}</td>
                  <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 13, fontWeight: 800, color: C.textDark, whiteSpace: "nowrap" }}>{fmt$(total)}</td>
                  <td style={{ padding: "11px 12px", fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>{DUE[Q.qn]}</td>
                  <td style={{ padding: "11px 12px" }}>
                    <button onClick={() => exportQuarter(qk)}
                      style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 6, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, color: "#4338CA", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                      ⬇ 941 Worksheet
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Payroll Component ────────────────────────────────────────────────────
export default function Payroll() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [toast, setToast] = useState("");
  const [runFilter, setRunFilter] = useState("all"); // all | paid | pending
  const [approverMap, setApproverMap] = useState({});
  const [exportingId, setExportingId] = useState(null);
  const { isMobile } = useBreakpoint();

  useEffect(() => { loadRuns(); }, []);

  async function loadRuns() {
    const { data } = await supabase
      .from("payroll_runs")
      .select("*")
      .order("pay_date", { ascending: false });
    setRuns(data || []);
    // Resolve approver names for display
    const ids = [...new Set((data || []).map(r => r.approved_by).filter(Boolean))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setApproverMap((profs || []).reduce((m, p) => { m[p.id] = p.full_name; return m; }, {}));
    }
    setLoading(false);
  }

  // Generate and download the NACHA ACH file for an approved/paid run.
  async function downloadAch(run) {
    setExportingId(run.id);
    try {
      const [{ data: stubs }, { data: docs }] = await Promise.all([
        supabase.from("pay_stubs").select("employee_id, net_pay, employees(full_name)").eq("payroll_run_id", run.id),
        supabase.from("employee_onboarding_docs").select("employee_id, dd_routing_number, dd_account_number, dd_account_type"),
      ]);
      const ddMap = (docs || []).reduce((m, d) => { if (d.dd_routing_number && d.dd_account_number && !m[d.employee_id]) m[d.employee_id] = d; return m; }, {});
      const entries = [];
      const skipped = [];
      (stubs || []).forEach(s => {
        const dd = ddMap[s.employee_id];
        const name = s.employees?.full_name || "Unknown";
        if (!dd) { skipped.push(name); return; }
        entries.push({
          name,
          routing: dd.dd_routing_number,
          account: dd.dd_account_number,
          accountType: dd.dd_account_type,
          amountCents: Math.round(Number(s.net_pay || 0) * 100),
          empId: s.employee_id.slice(0, 15),
        });
      });
      if (entries.length === 0) { showToast("No employees with direct deposit on file — nothing to export."); setExportingId(null); return; }
      const file = buildAchFile(run, entries);
      const blob = new Blob([file], { type: "text/plain;charset=ascii" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${brand.name.replace(/s+/g,"")}_ACH_${run.pay_date}.ach`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`ACH file generated — ${entries.length} credit${entries.length !== 1 ? "s" : ""}, ${fmt$(entries.reduce((s, e) => s + e.amountCents, 0) / 100)} total.${skipped.length ? ` Skipped (no direct deposit): ${skipped.join(", ")}` : ""}`);
    } catch (e) {
      showToast("ACH export failed: " + e.message);
    }
    setExportingId(null);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  async function handleRunSuccess(result) {
    setShowRunModal(false);
    showToast(`Draft payroll created — ${result.summary?.employee_count} employees · ${fmt$(result.summary?.total_gross)} gross`);
    if (result.warnings?.length) showToast(result.warnings[0]);
    await loadRuns();
  }

  async function advanceStatus(run) {
    const next = { draft: "review", review: "approved", approved: "paid" }[run.status];
    if (!next) return;
    setApprovingId(run.id);
    try {
      const { data, error } = await supabase.functions.invoke("approve-payroll-run", {
        body: { payroll_run_id: run.id, status: next },
      });
      if (error || data?.error) throw error || new Error(data.error);
      showToast(data.message || `Status updated to ${next}`);
      await loadRuns();
    } catch (e) {
      showToast("Error: " + e.message);
    }
    setApprovingId(null);
  }

  const ACTION_LABEL = { draft: "Submit for Review", review: "Approve", approved: "Mark as Paid" };
  const ACTION_COLOR = { draft: C.violet, review: C.blue, approved: C.emerald };

  // Summary metrics across all runs
  const totalPaid    = runs.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.total_net || 0), 0);
  const pendingCount = runs.filter(r => ["draft","review","approved"].includes(r.status)).length;
  const lastRun      = runs[0];

  // Metric-card drill-down filter
  const visibleRuns = runs.filter(r =>
    runFilter === "paid"    ? r.status === "paid" :
    runFilter === "pending" ? ["draft","review","approved"].includes(r.status) :
    true
  );

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: C.textDark }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0A2540", color: "#fff", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 500, zIndex: 2000, boxShadow: "0 8px 30px rgba(0,0,0,0.25)", maxWidth: 360 }}>
          {toast}
        </div>
      )}

      {/* Modals */}
      {showRunModal && (
        <RunPayrollModal
          onClose={() => setShowRunModal(false)}
          onSuccess={handleRunSuccess}
        />
      )}
      {selectedRun && (
        <PayStubsDrawer
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}

      {/* Page header */}
      <div style={{ marginBottom: 28, paddingBottom: 22, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? 20 : 22, fontWeight: 800, color: C.textDark, letterSpacing: "-0.02em" }}>Payroll</h2>
            <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 13 }}>Calculate, review, and approve payroll runs for {brand.name}</p>
          </div>
          <button
            onClick={() => setShowRunModal(true)}
            style={{ background: C.teal, border: "none", borderRadius: 9, padding: "11px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            + Run Payroll
          </button>
        </div>
      </div>

      {/* Metric cards — every number drills into its data */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Paid YTD",    value: fmt$(totalPaid),                       color: C.emerald, hint: "View paid runs",
            active: runFilter === "paid",
            onClick: () => setRunFilter(f => f === "paid" ? "all" : "paid") },
          { label: "Pending Runs",      value: String(pendingCount),                  color: C.amber,   hint: "View pending runs",
            active: runFilter === "pending",
            onClick: () => setRunFilter(f => f === "pending" ? "all" : "pending") },
          { label: "Last Pay Date",     value: lastRun ? fmtDate(lastRun.pay_date) : "—", color: C.blue, hint: "Open last run",
            onClick: lastRun ? () => setSelectedRun(lastRun) : null },
          { label: "Last Run Employees",value: lastRun ? String(lastRun.employee_count) : "—", color: C.teal, hint: "View pay stubs",
            onClick: lastRun ? () => setSelectedRun(lastRun) : null },
        ].map((m, i) => (
          <div key={i} onClick={m.onClick || undefined} title={m.onClick ? m.hint : undefined}
            style={{ background: m.active ? `${m.color}0C` : C.bgCard, border: `1px solid ${m.active ? m.color : C.border}`, borderRadius: 12, padding: "18px 20px", cursor: m.onClick ? "pointer" : "default", transition: "border-color 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { if (m.onClick) { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.boxShadow = `0 2px 10px ${m.color}25`; } }}
            onMouseLeave={e => { if (!m.active) { e.currentTarget.style.borderColor = C.border; } e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: m.color, letterSpacing: "-0.02em", textDecoration: m.onClick ? "underline" : "none", textDecorationColor: `${m.color}50`, textUnderlineOffset: 3 }}>{m.value}</div>
            {m.active && <div style={{ fontSize: 10, fontWeight: 700, color: m.color, marginTop: 6 }}>Filtering · click to clear</div>}
          </div>
        ))}
      </div>

      {/* Pay Runs table */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>
            Payroll Runs
            {runFilter !== "all" && (
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: runFilter === "paid" ? C.emerald : C.amber, background: runFilter === "paid" ? "#ECFDF5" : "#FFFBEB", borderRadius: 20, padding: "2px 10px", textTransform: "capitalize" }}>
                {runFilter} only
                <span onClick={() => setRunFilter("all")} style={{ marginLeft: 6, cursor: "pointer" }}>✕</span>
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: C.textMuted }}>{visibleRuns.length} run{visibleRuns.length !== 1 ? "s" : ""}</div>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: C.textMuted, fontSize: 14 }}>Loading payroll runs…</div>
        ) : visibleRuns.length === 0 && runs.length > 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
            No {runFilter} runs. <span onClick={() => setRunFilter("all")} style={{ color: C.blue, fontWeight: 600, cursor: "pointer" }}>Show all runs</span>
          </div>
        ) : runs.length === 0 ? (
          <div style={{ padding: 56, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.textDark, marginBottom: 6 }}>No payroll runs yet</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>Click "Run Payroll" to calculate your first pay period.</div>
            <button onClick={() => setShowRunModal(true)} style={{ background: C.teal, border: "none", borderRadius: 8, padding: "11px 22px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              + Run Payroll
            </button>
          </div>
        ) : isMobile ? (
          /* Mobile: card list */
          <div style={{ padding: "8px 0" }}>
            {visibleRuns.map(run => (
              <div key={run.id} style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: C.textDark, fontSize: 14 }}>
                      {fmtDate(run.pay_period_start)} – {fmtDate(run.pay_period_end)}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Pay date: {fmtDate(run.pay_date)} · {run.employee_count} employees</div>
                  </div>
                  <StatusBadge status={run.status} />
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  <div><div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Gross</div><div style={{ fontWeight: 700, color: C.textDark }}>{fmt$(run.total_gross)}</div></div>
                  <div><div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Net</div><div style={{ fontWeight: 700, color: C.emerald }}>{fmt$(run.total_net)}</div></div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setSelectedRun(run)} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 0", fontSize: 12, color: C.textMid, cursor: "pointer", fontFamily: "inherit" }}>
                    View Stubs
                  </button>
                  {["approved", "paid"].includes(run.status) && (
                    <button onClick={() => downloadAch(run)} disabled={exportingId === run.id}
                      style={{ flex: 1, background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 7, padding: "8px 0", fontSize: 12, fontWeight: 700, color: "#4338CA", cursor: "pointer", fontFamily: "inherit", opacity: exportingId === run.id ? 0.6 : 1 }}>
                      {exportingId === run.id ? "…" : "⬇ ACH"}
                    </button>
                  )}
                  {ACTION_LABEL[run.status] && (
                    <button
                      onClick={() => advanceStatus(run)}
                      disabled={approvingId === run.id}
                      style={{ flex: 2, background: ACTION_COLOR[run.status], border: "none", borderRadius: 7, padding: "8px 0", fontSize: 12, fontWeight: 700, color: "#fff", cursor: approvingId === run.id ? "default" : "pointer", opacity: approvingId === run.id ? 0.7 : 1, fontFamily: "inherit" }}>
                      {approvingId === run.id ? "…" : ACTION_LABEL[run.status]}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop: table */
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Pay Period", "Pay Date", "Emp.", "Gross", "Tax", "Net", "Status", "Actions"].map((h, hi) => (
                  <th key={h} style={{ padding: "11px 12px", textAlign: hi >= 3 && hi <= 5 ? "right" : "left", fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRuns.map((run, i) => {
                const numCell = { cursor: "pointer", textDecorationLine: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 };
                const open = () => setSelectedRun(run);
                return (
                <tr key={run.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                  <td style={{ padding: "12px 12px", whiteSpace: "nowrap", cursor: "pointer" }} onClick={open} title="View pay stubs">
                    <div style={{ fontWeight: 600, color: C.textDark, fontSize: 13 }}>
                      {fmtDate(run.pay_period_start)} – {fmtDate(run.pay_period_end)}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                      {run.status === "approved" && run.approved_at && `Approved${run.approved_by && approverMap[run.approved_by] ? ` by ${approverMap[run.approved_by]}` : ""} ${fmtDateTime(run.approved_at)}`}
                      {run.status === "paid"     && run.paid_at     && `Paid${run.approved_by && approverMap[run.approved_by] ? ` · approved by ${approverMap[run.approved_by]}` : ""} ${fmtDateTime(run.paid_at)}`}
                    </div>
                  </td>
                  <td onClick={open} title="View pay stubs" style={{ padding: "12px 12px", color: C.textMid, fontSize: 13, whiteSpace: "nowrap", ...numCell, textDecorationColor: "#CBD5E1" }}>{fmtDate(run.pay_date)}</td>
                  <td onClick={open} title="View pay stubs" style={{ padding: "12px 12px", color: C.blue, fontWeight: 600, fontSize: 13, textAlign: "center", ...numCell, textDecorationColor: `${C.blue}50` }}>{run.employee_count}</td>
                  <td onClick={open} title="View pay stubs" style={{ padding: "12px 12px", fontWeight: 600, color: C.textDark, fontSize: 13, textAlign: "right", whiteSpace: "nowrap", ...numCell, textDecorationColor: "#CBD5E1" }}>{fmt$(run.total_gross)}</td>
                  <td onClick={open} title="View pay stubs" style={{ padding: "12px 12px", color: C.rose, fontSize: 13, textAlign: "right", whiteSpace: "nowrap", ...numCell, textDecorationColor: `${C.rose}50` }}>{fmt$(run.total_tax_withheld)}</td>
                  <td onClick={open} title="View pay stubs" style={{ padding: "12px 12px", fontWeight: 700, color: C.emerald, fontSize: 13, textAlign: "right", whiteSpace: "nowrap", ...numCell, textDecorationColor: `${C.emerald}50` }}>{fmt$(run.total_net)}</td>
                  <td style={{ padding: "12px 12px" }}><StatusBadge status={run.status} /></td>
                  <td style={{ padding: "12px 12px" }}>
                    <div style={{ display: "flex", gap: 7 }}>
                      <button
                        onClick={() => setSelectedRun(run)}
                        style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, color: C.textMid, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                        View Stubs
                      </button>
                      {["approved", "paid"].includes(run.status) && (
                        <button
                          onClick={() => downloadAch(run)}
                          disabled={exportingId === run.id}
                          title="Download bank-ready NACHA ACH file for this run"
                          style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#4338CA", cursor: exportingId === run.id ? "default" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", opacity: exportingId === run.id ? 0.6 : 1 }}>
                          {exportingId === run.id ? "…" : "⬇ ACH File"}
                        </button>
                      )}
                      {ACTION_LABEL[run.status] && (
                        <button
                          onClick={() => advanceStatus(run)}
                          disabled={approvingId === run.id}
                          title={["review"].includes(run.status) ? "Requires an executive role" : undefined}
                          style={{ background: ACTION_COLOR[run.status], border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: approvingId === run.id ? "default" : "pointer", opacity: approvingId === run.id ? 0.7 : 1, fontFamily: "inherit", whiteSpace: "nowrap" }}>
                          {approvingId === run.id ? "…" : ACTION_LABEL[run.status]}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Tax liability report */}
      <TaxLiability showToast={showToast} />

      {/* Footer note */}
      <div style={{ marginTop: 16, fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
        Federal withholding calculated using 2026 IRS Pub 15-T percentage method. Georgia state tax at 5.49% flat rate. FICA: Social Security 6.2% (up to $176,100 wage base) · Medicare 1.45% + 0.9% additional above threshold. FUTA/SUTA figures are estimates. This system prepares filing numbers but does not file or remit taxes — deposits are made via EFTPS (federal) and Georgia Tax Center (state). Consult a tax professional for official payroll compliance.
      </div>
    </div>
  );
}
