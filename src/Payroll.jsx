import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { useBreakpoint } from "./useBreakpoint";

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

// ── Main Payroll Component ────────────────────────────────────────────────────
export default function Payroll() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [toast, setToast] = useState("");
  const { isMobile } = useBreakpoint();

  useEffect(() => { loadRuns(); }, []);

  async function loadRuns() {
    const { data } = await supabase
      .from("payroll_runs")
      .select("*")
      .order("pay_date", { ascending: false });
    setRuns(data || []);
    setLoading(false);
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
            <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 13 }}>Calculate, review, and approve payroll runs for QumulusAI</p>
          </div>
          <button
            onClick={() => setShowRunModal(true)}
            style={{ background: C.teal, border: "none", borderRadius: 9, padding: "11px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            + Run Payroll
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Paid YTD",    value: fmt$(totalPaid),                       color: C.emerald },
          { label: "Pending Runs",      value: String(pendingCount),                  color: C.amber   },
          { label: "Last Pay Date",     value: lastRun ? fmtDate(lastRun.pay_date) : "—", color: C.blue },
          { label: "Last Run Employees",value: lastRun ? String(lastRun.employee_count) : "—", color: C.teal },
        ].map((m, i) => (
          <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: m.color, letterSpacing: "-0.02em" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Pay Runs table */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>Payroll Runs</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>{runs.length} run{runs.length !== 1 ? "s" : ""}</div>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: C.textMuted, fontSize: 14 }}>Loading payroll runs…</div>
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
            {runs.map(run => (
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
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Pay Period", "Pay Date", "Employees", "Total Gross", "Tax Withheld", "Total Net", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((run, i) => (
                <tr key={run.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ fontWeight: 600, color: C.textDark, fontSize: 13 }}>
                      {fmtDate(run.pay_period_start)} – {fmtDate(run.pay_period_end)}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                      {run.status === "approved" && run.approved_at && `Approved ${fmtDateTime(run.approved_at)}`}
                      {run.status === "paid"     && run.paid_at     && `Paid ${fmtDateTime(run.paid_at)}`}
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px", color: C.textMid, fontSize: 13 }}>{fmtDate(run.pay_date)}</td>
                  <td style={{ padding: "13px 16px", color: C.textMid, fontSize: 13, textAlign: "center" }}>{run.employee_count}</td>
                  <td style={{ padding: "13px 16px", fontWeight: 600, color: C.textDark, fontSize: 13 }}>{fmt$(run.total_gross)}</td>
                  <td style={{ padding: "13px 16px", color: C.rose, fontSize: 13 }}>{fmt$(run.total_tax_withheld)}</td>
                  <td style={{ padding: "13px 16px", fontWeight: 700, color: C.emerald, fontSize: 13 }}>{fmt$(run.total_net)}</td>
                  <td style={{ padding: "13px 16px" }}><StatusBadge status={run.status} /></td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 7 }}>
                      <button
                        onClick={() => setSelectedRun(run)}
                        style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, color: C.textMid, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                        View Stubs
                      </button>
                      {ACTION_LABEL[run.status] && (
                        <button
                          onClick={() => advanceStatus(run)}
                          disabled={approvingId === run.id}
                          style={{ background: ACTION_COLOR[run.status], border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: approvingId === run.id ? "default" : "pointer", opacity: approvingId === run.id ? 0.7 : 1, fontFamily: "inherit", whiteSpace: "nowrap" }}>
                          {approvingId === run.id ? "…" : ACTION_LABEL[run.status]}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer note */}
      <div style={{ marginTop: 16, fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>
        Federal withholding calculated using 2026 IRS Pub 15-T percentage method. Georgia state tax at 5.49% flat rate. FICA: Social Security 6.2% (up to $176,100 wage base) · Medicare 1.45% + 0.9% additional above threshold. Consult a tax professional for official payroll compliance.
      </div>
    </div>
  );
}
