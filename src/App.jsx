import { useState, useEffect } from "react";
import { useBreakpoint } from "./useBreakpoint";
import Auth, { getPreviousLogin } from "./Auth";
import { supabase } from "./supabase";
import CommandCenter from "./CommandCenter";
import CareersPortal from "./Careers";
import TalentInbox from "./TalentInbox";
import Messenger from "./Messenger";
import EmployeePortal from "./EmployeePortal";
import OfferSigning from "./OfferSigning";
import NewHirePortal from "./NewHirePortal";
import AISourcing from "./AISourcing";
import SecurityActivity from "./SecurityActivity";
import AssessmentPortal from "./AssessmentPortal";
import Payroll from "./Payroll";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:           "#F0F2F7",
  bgCard:       "#FFFFFF",
  bgSidebar:    "#080D1A",
  bgSidebarHov: "#0F1828",
  bgActive:     "#0A2540",

  textDark:     "#0D1117",
  textMid:      "#3D4B5C",
  textMuted:    "#7E8FA3",
  textOnDark:   "#E8EEF8",
  textMutedDark:"#4A6080",

  border:       "#DDE3ED",
  borderDark:   "#0F1E30",

  cyan:         "#00C2E0",
  cyanDark:     "#0099B8",
  navy:         "#0A2540",
  navyMid:      "#1A3A5C",

  blue:         "#2563EB",
  blueLight:    "#3B82F6",
  violet:       "#7C3AED",
  violetLight:  "#8B5CF6",
  teal:         "#0D9488",
  tealLight:    "#14B8A6",
  amber:        "#D97706",
  amberLight:   "#F59E0B",
  rose:         "#DC2626",
  roseLight:    "#EF4444",
  emerald:      "#059669",
  emeraldLight: "#10B981",
};

const NAV_GROUPS = [
  {
    id: "executive",
    label: "Executive",
    items: [
      { id: "home",      label: "Command Center",      icon: "❖", accent: C.cyan },
      { id: "executive", label: "Workforce Intelligence", icon: "◆", accent: C.amber },
    ],
  },
  {
    id: "talent",
    label: "Talent",
    items: [
      { id: "recruit",   label: "Recruiting",          icon: "◈", accent: C.violet },
      { id: "careers",   label: "Careers",             icon: "◉", accent: C.emerald },
      { id: "inbox",     label: "Talent Inbox",        icon: "◎", accent: C.rose },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { id: "employee",  label: "Employee Hub",        icon: "○", accent: C.blueLight },
      { id: "onboard",   label: "Onboarding",          icon: "◎", accent: C.teal },
      { id: "manager",   label: "Manager Coach",       icon: "◇", accent: C.blue },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { id: "payroll",   label: "Payroll",             icon: "◈", accent: C.teal },
      { id: "security",  label: "Security Center",     icon: "⚔", accent: C.blue },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    items: [
      { id: "messenger", label: "Messenger",           icon: "◈", accent: C.cyan },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap(g => g.items);

const EMPLOYEES = [
  { name: "Ryan Callahan", role: "GPU Infrastructure Engineer",  dept: "Infrastructure", tenure: "1.8 yrs", sentiment: 78, risk: "medium" },
  { name: "Aisha Okonkwo", role: "AI Solutions Architect",       dept: "Solutions Eng",  tenure: "0.9 yrs", sentiment: 85, risk: "low" },
  { name: "Derek Huang",   role: "Data Center Operations Lead",  dept: "DC Ops",         tenure: "2.1 yrs", sentiment: 52, risk: "high" },
  { name: "Priya Menon",   role: "Enterprise Account Executive", dept: "Sales",          tenure: "0.6 yrs", sentiment: 67, risk: "medium" },
];

const OPEN_ROLES = [
  { title: "VP of People & Culture",         dept: "People",    candidates: 9,  stage: "Interviewing", days: 41 },
  { title: "Senior GPU Infrastructure Eng",  dept: "Infra",     candidates: 34, stage: "Screening",    days: 14 },
  { title: "Director of Enterprise Sales",   dept: "Sales",     candidates: 22, stage: "Assessment",   days: 28 },
  { title: "AI Solutions Engineer - EMEA",   dept: "Solutions", candidates: 17, stage: "Offer",        days: 52 },
  { title: "Data Center Operations Manager", dept: "DC Ops",    candidates: 28, stage: "Screening",    days: 9  },
  { title: "CFO",                            dept: "Finance",   candidates: 6,  stage: "Interviewing", days: 63 },
];

const METRICS = [
  { label: "Headcount",     value: "18",  delta: "+6",   trend: "up",   page: "employee" },
  { label: "Open Roles",    value: "21",  delta: "+12",  trend: "up",   page: "recruit"  },
  { label: "Time-to-Hire",  value: "38d", delta: "+10d", trend: "down", page: "recruit"  },
  { label: "Engagement",    value: "81",  delta: "+6",   trend: "up",   page: "executive"},
  { label: "Offer Accept",  value: "91%", delta: "+4pp", trend: "up",   page: "recruit"  },
  { label: "Attrition YTD",value: "11%", delta: "+3pp", trend: "down", page: "executive"},
];

// ─── AI Hook ──────────────────────────────────────────────────────────────────
function useAI() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  const ask = async (system, user) => {
    setLoading(true);
    setResponse("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-query", {
        body: { system, messages: [{ role: "user", content: user }], max_tokens: 1000 },
      });
      if (error) throw error;
      if (data?.error) {
        setResponse("AI error: " + (typeof data.error === "string" ? data.error : JSON.stringify(data.error)));
      } else {
        setResponse(data?.content?.map(b => b.text || "").join("") || "No response.");
      }
    } catch (e) {
      setResponse("Couldn't reach AI: " + e.message);
    }
    setLoading(false);
  };

  return { ask, loading, response, setResponse };
}

// ─── Onboarding Pipeline Hook ─────────────────────────────────────────────────
function useOnboardingPipeline() {
  const [pipeline, setPipeline] = useState(null);

  useEffect(() => {
    async function load() {
      const [{ data: docs }, { data: emps }, { data: apps }] = await Promise.all([
        supabase.from("employee_onboarding_docs").select("employee_id, status, w4_signed_at, i9_signed_at, dd_signed_at, created_at"),
        supabase.from("employees").select("id, full_name, role_title, start_date, email, status").eq("status", "active"),
        supabase.from("applications").select("id, full_name, role_title, status, created_at").eq("status", "hired"),
      ]);

      const today = new Date();
      const daysSince = d => d ? Math.floor((today - new Date(d)) / 86400000) : null;
      const docByEmp = (docs || []).reduce((m, d) => { m[d.employee_id] = d; return m; }, {});
      const hiredApps = (apps || []);

      // Build per-person stage
      const people = (emps || []).map(e => {
        const doc = docByEmp[e.id];
        const hiredApp = hiredApps.find(a => a.full_name === e.full_name);
        const startDays = daysSince(e.start_date);
        const docsComplete = doc && doc.w4_signed_at && doc.i9_signed_at && doc.dd_signed_at;

        let stage;
        if (!hiredApp && !e.start_date) stage = "offer_signed";
        else if (!docsComplete) stage = "docs_pending";
        else if (startDays === null || startDays < 0) stage = "docs_complete";
        else if (startDays < 30) stage = "day1";
        else if (startDays < 60) stage = "day30";
        else if (startDays < 90) stage = "day60";
        else stage = "day90";

        return { ...e, doc, hiredApp, startDays, docsComplete, stage };
      });

      const STAGES = [
        { key: "offer_signed",  label: "Offer Signed",       icon: "✦", color: C.violet },
        { key: "docs_pending",  label: "Docs Pending",       icon: "⏳", color: C.amber  },
        { key: "docs_complete", label: "Docs Complete",      icon: "✓",  color: C.teal   },
        { key: "day1",          label: "Day 1–30",           icon: "◈",  color: C.cyan   },
        { key: "day30",         label: "30-Day Review",      icon: "◎",  color: C.blue   },
        { key: "day60",         label: "60-Day Review",      icon: "◉",  color: C.emerald},
        { key: "day90",         label: "90-Day Complete",    icon: "❖",  color: "#059669"},
      ];

      const counts = STAGES.reduce((m, s) => { m[s.key] = people.filter(p => p.stage === s.key).length; return m; }, {});
      setPipeline({ people, stages: STAGES, counts });
    }
    load();
  }, []);

  return pipeline;
}

// ─── Shared UI Components ─────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22, ...style }}>
      {children}
    </div>
  );
}

function Label({ children, color }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: color || C.textMuted, marginBottom: 14 }}>
      {children}
    </div>
  );
}

function Badge({ label }) {
  const map = {
    low:          { bg: "#05966910", text: C.emerald },
    medium:       { bg: "#D9770610", text: C.amber },
    high:         { bg: "#DC262610", text: C.rose },
    Interviewing: { bg: "#7C3AED10", text: C.violet },
    Offer:        { bg: "#05966910", text: C.emerald },
    Screening:    { bg: "#D9770610", text: C.amber },
    Assessment:   { bg: "#0D948810", text: C.teal },
  };
  const s = map[label] || { bg: "#00000008", text: C.textMid };
  return (
    <span style={{ background: s.bg, color: s.text, borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "inline-block" }}>
      {label}
    </span>
  );
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trim = line.trim();
    // Table: collect consecutive | lines
    if (trim.startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const rows = tableLines.filter(l => !/^\|[-| :]+\|$/.test(l));
      const parsed = rows.map(r => r.replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
      if (parsed.length > 0) {
        elements.push(
          <div key={i} style={{ overflowX: "auto", marginBottom: 12 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
              <thead>
                <tr>{parsed[0].map((h, j) => <th key={j} style={{ padding: "6px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", fontWeight: 700, textAlign: "left", color: C.textDark }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {parsed.slice(1).map((row, ri) => (
                  <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={{ padding: "6px 12px", border: "1px solid #E2E8F0", color: C.textMid, verticalAlign: "top" }}>{inlineFormat(cell)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }
    // Headings
    if (trim.startsWith("### ")) { elements.push(<h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: C.textDark, margin: "14px 0 4px" }}>{inlineFormat(trim.slice(4))}</h3>); i++; continue; }
    if (trim.startsWith("## "))  { elements.push(<h2 key={i} style={{ fontSize: 16, fontWeight: 800, color: C.textDark, margin: "18px 0 6px" }}>{inlineFormat(trim.slice(3))}</h2>); i++; continue; }
    if (trim.startsWith("# "))   { elements.push(<h1 key={i} style={{ fontSize: 18, fontWeight: 900, color: C.textDark, margin: "20px 0 8px", letterSpacing: "-0.01em" }}>{inlineFormat(trim.slice(2))}</h1>); i++; continue; }
    // HR
    if (trim === "---" || trim === "***") { elements.push(<hr key={i} style={{ border: "none", borderTop: "1px solid #E2E8F0", margin: "12px 0" }} />); i++; continue; }
    // Bullet list
    if (trim.startsWith("- ") || trim.startsWith("* ")) { elements.push(<div key={i} style={{ display: "flex", gap: 8, margin: "3px 0", fontSize: 13 }}><span style={{ color: C.textMuted, flexShrink: 0, marginTop: 2 }}>•</span><span style={{ color: C.textMid }}>{inlineFormat(trim.slice(2))}</span></div>); i++; continue; }
    // Empty
    if (!trim) { elements.push(<div key={i} style={{ height: 6 }} />); i++; continue; }
    // Paragraph
    elements.push(<p key={i} style={{ margin: "3px 0", fontSize: 13, lineHeight: 1.7, color: C.textMid }}>{inlineFormat(trim)}</p>);
    i++;
  }
  return elements;
}

function inlineFormat(text) {
  if (!text) return "";
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ color: C.textDark }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}

function AIBox({ loading, response, accent }) {
  if (!loading && !response) return null;
  const a = accent || C.cyan;
  return (
    <div style={{ background: `${a}08`, border: `1px solid ${a}25`, borderLeft: `3px solid ${a}`, borderRadius: 8, padding: 18, marginTop: 14, color: C.textDark }}>
      {loading
        ? <span style={{ color: a, fontSize: 13, fontWeight: 600 }}>◈ QumulusAI is thinking…</span>
        : <>
            <div style={{ fontSize: 9, fontWeight: 800, color: a, letterSpacing: "0.14em", marginBottom: 10 }}>✦ QUMULUSAI INTELLIGENCE</div>
            {renderMarkdown(response)}
          </>
      }
    </div>
  );
}

function AIInput({ placeholder, onSubmit, loading, accent }) {
  const [val, setVal] = useState("");
  const { isMobile } = useBreakpoint();
  const a = accent || C.cyan;
  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 8, marginTop: 14 }}>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onSubmit(val); setVal(""); } }}
        placeholder={placeholder}
        style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", color: C.textDark, fontSize: 14, outline: "none", fontFamily: "inherit", minHeight: 44, boxSizing: "border-box" }}
      />
      <button
        onClick={() => { if (val.trim()) { onSubmit(val); setVal(""); } }}
        disabled={loading || !val.trim()}
        style={{ background: a, color: "#fff", border: "none", borderRadius: 8, padding: "12px 22px", fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1, fontFamily: "inherit", minHeight: 44, width: isMobile ? "100%" : "auto" }}
      >{loading ? "…" : "Generate"}</button>
    </div>
  );
}

function Chip({ label, onClick, accent }) {
  const a = accent || C.cyan;
  return (
    <button onClick={onClick} style={{ background: `${a}10`, border: `1px solid ${a}30`, borderRadius: 100, padding: "7px 14px", fontSize: 12, color: a, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, minHeight: 36 }}>
      {label}
    </button>
  );
}

function SectionHeader({ icon, title, subtitle, accent, tag }) {
  const { isMobile } = useBreakpoint();
  return (
    <div style={{ marginBottom: isMobile ? 20 : 26, paddingBottom: isMobile ? 16 : 22, borderBottom: `1px solid ${C.border}` }}>
      {tag && (
        <div style={{ display: "inline-block", background: `${accent||C.cyan}12`, border: `1px solid ${accent||C.cyan}30`, borderRadius: 100, padding: "3px 12px", fontSize: 9, fontWeight: 800, color: accent||C.cyan, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
          {tag}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ color: accent || C.cyan, fontSize: isMobile ? 17 : 20, flexShrink: 0 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: isMobile ? 19 : 21, fontWeight: 800, color: C.textDark, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{title}</h2>
      </div>
      {subtitle && <p style={{ margin: 0, color: C.textMuted, fontSize: 13, lineHeight: 1.65 }}>{subtitle}</p>}
    </div>
  );
}

// ─── REQUISITIONS ─────────────────────────────────────────────────────────────
function RequisitionsTab() {
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const BLANK = { title: "", department: "", location: "", employment_type: "full_time", headcount: 1, salary_min: "", salary_max: "", description: "", requirements: "", role_category: "general", hiring_manager: "", status: "open" };
  const [form, setForm] = useState(BLANK);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("job_requisitions").select("*").order("created_at", { ascending: false });
      setReqs(data || []);
      setLoading(false);
    }
    load();
  }, []);

  function startNew() { setForm(BLANK); setEditingId(null); setShowForm(true); }
  function startEdit(r) { setForm({ ...r, salary_min: r.salary_min || "", salary_max: r.salary_max || "" }); setEditingId(r.id); setShowForm(true); }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      organization_id: "00000000-0000-0000-0000-000000000001",
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
      headcount: Number(form.headcount) || 1,
      updated_at: new Date().toISOString(),
    };
    if (editingId) {
      await supabase.from("job_requisitions").update(payload).eq("id", editingId);
      setReqs(prev => prev.map(r => r.id === editingId ? { ...r, ...payload } : r));
    } else {
      const { data } = await supabase.from("job_requisitions").insert(payload).select().single();
      if (data) setReqs(prev => [data, ...prev]);
    }
    setSaving(false);
    setShowForm(false);
  }

  async function handleClose(id) {
    await supabase.from("job_requisitions").update({ status: "closed" }).eq("id", id);
    setReqs(prev => prev.map(r => r.id === id ? { ...r, status: "closed" } : r));
  }

  const statusColor = { open: C.emerald, closed: C.textMuted, paused: C.amber };
  const fieldStyle = { width: "100%", boxSizing: "border-box", background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: C.textDark, fontFamily: "inherit", outline: "none" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Label color={C.violet}>Job Requisitions ({reqs.filter(r => r.status === "open").length} open)</Label>
        <button onClick={startNew} style={{ background: C.violet, color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ New Req</button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16, borderTop: `3px solid ${C.violet}` }}>
          <Label color={C.violet}>{editingId ? "Edit Requisition" : "New Requisition"}</Label>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Job Title *</div><input style={fieldStyle} placeholder="e.g. Senior GPU Infrastructure Engineer" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Department</div><input style={fieldStyle} placeholder="e.g. Infrastructure" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Location</div><input style={fieldStyle} placeholder="e.g. Marietta, GA / Remote" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Hiring Manager</div><input style={fieldStyle} placeholder="Name" value={form.hiring_manager} onChange={e => setForm(f => ({ ...f, hiring_manager: e.target.value }))} /></div>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Headcount</div><input style={fieldStyle} type="number" min={1} value={form.headcount} onChange={e => setForm(f => ({ ...f, headcount: e.target.value }))} /></div>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Employment Type</div>
              <select style={fieldStyle} value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}>
                <option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option><option value="intern">Intern</option>
              </select>
            </div>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Salary Min ($)</div><input style={fieldStyle} type="number" placeholder="120000" value={form.salary_min} onChange={e => setForm(f => ({ ...f, salary_min: e.target.value }))} /></div>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Salary Max ($)</div><input style={fieldStyle} type="number" placeholder="160000" value={form.salary_max} onChange={e => setForm(f => ({ ...f, salary_max: e.target.value }))} /></div>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Role Category</div>
              <select style={fieldStyle} value={form.role_category} onChange={e => setForm(f => ({ ...f, role_category: e.target.value }))}>
                {["general","technical","sales","product","finance","people","executive"].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div><div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Status</div>
              <select style={fieldStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="open">Open</option><option value="paused">Paused</option><option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Requirements</div>
            <textarea style={{ ...fieldStyle, height: 70, resize: "vertical" }} placeholder="Key requirements, one per line" value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Role Description</div>
            <textarea style={{ ...fieldStyle, height: 90, resize: "vertical" }} placeholder="Role summary and responsibilities" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} disabled={saving || !form.title.trim()} style={{ background: C.violet, color: "#fff", border: "none", borderRadius: 7, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Create Requisition"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 16px", fontSize: 13, color: C.textMuted, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </div>
        </Card>
      )}

      {loading ? (
        <div style={{ color: C.textMuted, fontSize: 13, padding: 20 }}>Loading requisitions…</div>
      ) : reqs.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 32, color: C.textMuted, fontSize: 13 }}>No requisitions yet. Create your first one above.</Card>
      ) : (
        reqs.map(r => (
          <Card key={r.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: C.textDark }}>{r.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: statusColor[r.status] || C.textMuted, background: `${statusColor[r.status] || C.textMuted}15`, borderRadius: 100, padding: "2px 9px" }}>{r.status}</span>
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                  {[r.department, r.location, r.headcount > 1 ? `${r.headcount} hires` : "1 hire", r.hiring_manager && `HM: ${r.hiring_manager}`].filter(Boolean).join(" · ")}
                </div>
                {(r.salary_min || r.salary_max) && (
                  <div style={{ fontSize: 12, color: C.textMid, marginTop: 3 }}>
                    ${r.salary_min?.toLocaleString()} – ${r.salary_max?.toLocaleString()}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => startEdit(r)} style={{ background: `${C.violet}12`, border: `1px solid ${C.violet}30`, borderRadius: 6, padding: "6px 12px", fontSize: 11, color: C.violet, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Edit</button>
                {r.status === "open" && <button onClick={() => handleClose(r.id)} style={{ background: "#F1F5F9", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 11, color: C.textMuted, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Close</button>}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── RECRUITING ENGINE ────────────────────────────────────────────────────────
function RecruitingEngine() {
  const intake = useAI();
  const interview = useAI();
  const candidate = useAI();
  const [activeTab, setActiveTab] = useState("intake");
  const { isMobile } = useBreakpoint();

  const intakeSys = `You are QumulusAI's Recruiting Intelligence engine. Context: You are an AI People Operations assistant for QumulusAI — a vertically integrated AI infrastructure company based in Marietta, Georgia. QumulusAI provides bare-metal GPU cloud services and is scaling rapidly from 18 to 300+ employees after securing $500M in financing. CEO is Mike Maniscalco. The company's mission is to universalize access to AI compute. Roles are highly technical: GPU Infrastructure Engineers, AI Solutions Architects, Data Center Operations, Enterprise Sales. When given a hiring need or role description, generate a comprehensive, structured recruiting package. Format your response with clear sections using headers like:

JOB TITLE:
BUSINESS NEED:
CANDIDATE PROFILE:
KEY COMPETENCIES:
MUST-HAVE REQUIREMENTS:
NICE-TO-HAVE:
INTERVIEW GUIDE (3-4 questions per competency):
EVALUATION SCORECARD:
SUGGESTED COMPENSATION RANGE:
RECRUITING STRATEGY:

Be specific, practical, and tailored. This will be used by a recruiter immediately.`;

  const interviewSys = `You are QumulusAI's Interview Intelligence engine. When given interview notes or a transcript, produce a structured debrief. Use these sections:

CANDIDATE:
ROLE:
OVERALL RECOMMENDATION: (Strong Hire / Hire / No Hire / Strong No Hire)
EXECUTIVE SUMMARY (2-3 sentences):
COMPETENCY ASSESSMENT:
- [Competency]: [Rating 1-5] — [Evidence from interview]
KEY STRENGTHS:
RISKS & CONCERNS:
SUGGESTED FOLLOW-UP QUESTIONS:
COMPARATIVE NOTES (if multiple candidates mentioned):

Be direct. Hiring managers need clarity, not hedging.`;

  const candidateSys = `You are QumulusAI's Candidate Evaluation engine. When given candidate information (resume summary, background, interview notes), evaluate them against the role. Use:

CANDIDATE NAME:
ROLE APPLIED:
MATCH SCORE: [X/10]
EXECUTIVE RECOMMENDATION: (Advance / Hold / Pass)
MATCH SUMMARY (2 sentences):
STRENGTHS RELATIVE TO ROLE:
GAPS & RISKS:
CULTURE & TEAM FIT SIGNALS:
SUGGESTED INTERVIEW FOCUS AREAS:
COMPENSATION FIT:

Be specific. Avoid generic language.`;

  const tabs = [
    { id: "intake",        label: "Intake Intelligence",   shortLabel: "Intake",    icon: "◈" },
    { id: "sourcing",      label: "AI Sourcing",           shortLabel: "Sourcing",  icon: "◈" },
    { id: "candidate",     label: "Candidate Evaluator",   shortLabel: "Evaluate",  icon: "◎" },
    { id: "interview",     label: "Interview Intelligence", shortLabel: "Interview", icon: "◇" },
    { id: "requisitions",  label: "Requisitions",          shortLabel: "Reqs",      icon: "◉" },
  ];

  return (
    <div>
      <SectionHeader icon="◈" accent={C.violet} title="AI Recruiting Engine" subtitle="From hiring need to accepted offer — one intelligent workflow. No admin. No gaps. No guesswork." />

      {/* Pipeline */}
      <Card style={{ marginBottom: 16 }}>
        <Label color={C.violet}>Live Pipeline</Label>
        {OPEN_ROLES.map(r => (
          <div key={r.title} style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}`, gap: isMobile ? 8 : 0 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.textDark }}>{r.title}</div>
              <div style={{ color: C.textMuted, fontSize: 12, marginTop: 3 }}>{r.dept} · {r.candidates} candidates · Day {r.days}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Badge label={r.stage} />
              <button
                onClick={() => { setActiveTab("intake"); intake.ask(intakeSys, `Generate a complete recruiting package for a ${r.title} role in the ${r.dept} department. This is day ${r.days} of the search with ${r.candidates} candidates in pipeline at the ${r.stage} stage.`); }}
                style={{ background: `${C.violet}15`, border: `1px solid ${C.violet}30`, borderRadius: 6, padding: "6px 12px", fontSize: 11, color: C.violet, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, minHeight: 36 }}>
                AI Generate ◈
              </button>
            </div>
          </div>
        ))}
      </Card>

      {/* AI Tools */}
      <Card>
        {/* Scrollable tabs — no wrapping, scrollable on mobile */}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginLeft: -22, marginRight: -22, paddingLeft: 22, paddingRight: 22, marginBottom: 0, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
          <div style={{ display: "flex", gap: 4, paddingBottom: 16, minWidth: "max-content" }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                background: activeTab === t.id ? `${C.violet}15` : "transparent",
                border: activeTab === t.id ? `1px solid ${C.violet}40` : `1px solid transparent`,
                borderRadius: 7, padding: "8px 14px", fontSize: 13,
                color: activeTab === t.id ? C.violet : C.textMuted,
                fontWeight: activeTab === t.id ? 700 : 400,
                cursor: "pointer", fontFamily: "inherit", minHeight: 44, whiteSpace: "nowrap",
              }}>{t.icon} {isMobile ? t.shortLabel : t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          {activeTab === "intake" && (
            <>
              <Label color={C.violet}>Hiring Manager Intake Intelligence</Label>
              <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>
                Describe the role or paste intake meeting notes. QumulusAI instantly generates a full recruiting package — job description, candidate profile, competency model, interview guide, and scorecard.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
                {[
                  "VP of Engineering to lead our 40-person team through a platform rebuild",
                  "Senior AI Product Manager to own our LLM product roadmap",
                  "Head of People Ops as we scale from 200 to 500 employees",
                ].map(q => <Chip key={q} label={isMobile ? q.slice(0, 38) + "…" : q} accent={C.violet} onClick={() => intake.ask(intakeSys, q)} />)}
              </div>
              <AIInput placeholder="Describe the role or paste intake notes…" onSubmit={q => intake.ask(intakeSys, q)} loading={intake.loading} accent={C.violet} />
              <AIBox loading={intake.loading} response={intake.response} accent={C.violet} />
            </>
          )}

          {activeTab === "sourcing" && <AISourcing />}

          {activeTab === "candidate" && (
            <>
              <Label color={C.violet}>Candidate Evaluator</Label>
              <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>
                Paste a candidate's background, resume summary, or LinkedIn profile. QumulusAI scores them against the role and gives a clear advance/pass recommendation.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
                {[
                  "Candidate: 8 yrs eng leadership at Stripe and Plaid, built teams of 60+, strong distributed systems background. Role: VP Engineering",
                  "Candidate: 5 yrs PM at Google, 2 yrs at OpenAI on GPT-4 integrations, MBA Stanford. Role: Senior AI Product Manager",
                  "Candidate: CHRO at 300-person SaaS for 4 yrs, previously recruiting at Workday, no AI-native company experience. Role: Head of People Ops",
                ].map(q => <Chip key={q} label={q.slice(0, 48) + "…"} accent={C.violet} onClick={() => candidate.ask(candidateSys, q)} />)}
              </div>
              <AIInput placeholder="Paste candidate background, resume summary, or LinkedIn…" onSubmit={q => candidate.ask(candidateSys, q)} loading={candidate.loading} accent={C.violet} />
              <AIBox loading={candidate.loading} response={candidate.response} accent={C.violet} />
            </>
          )}

          {activeTab === "interview" && (
            <>
              <Label color={C.violet}>Interview Intelligence</Label>
              <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>
                Paste interview notes or a transcript. QumulusAI produces a structured debrief with competency ratings, hire recommendation, risks, and suggested follow-ups.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
                {[
                  "Interview with Sarah Chen for VP Eng. She described rebuilding Stripe's infra team from 15 to 55 people over 3 years. Struggled to answer questions about org design at scale. Strong on technical vision, weaker on people development.",
                  "Interview with David Park for AI PM. Passionate, deep LLM knowledge, shipped 3 AI features at OpenAI. Seemed uncomfortable with enterprise sales cycles and customer discovery.",
                ].map(q => <Chip key={q} label={q.slice(0, 48) + "…"} accent={C.violet} onClick={() => interview.ask(interviewSys, q)} />)}
              </div>
              <AIInput placeholder="Paste interview notes or transcript…" onSubmit={q => interview.ask(interviewSys, q)} loading={interview.loading} accent={C.violet} />
              <AIBox loading={interview.loading} response={interview.response} accent={C.violet} />
            </>
          )}

          {activeTab === "requisitions" && <RequisitionsTab />}
        </div>
      </Card>
    </div>
  );
}

// ─── ONBOARDING TRACKER ───────────────────────────────────────────────────────
function OnboardingTracker({ onNavigate, compact = false }) {
  const pipeline = useOnboardingPipeline();
  const [activeStage, setActiveStage] = useState(null);

  if (!pipeline) return (
    <Card style={{ marginBottom: 14 }}>
      <Label color={C.teal}>Onboarding Pipeline</Label>
      <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>Loading pipeline…</p>
    </Card>
  );

  const { people, stages, counts } = pipeline;
  const total = people.length;
  const inProgress = people.filter(p => p.stage !== "day90").length;

  const drillPeople = activeStage ? people.filter(p => p.stage === activeStage) : [];
  const activeInfo = stages.find(s => s.key === activeStage);

  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <Label color={C.teal} style={{ marginBottom: 0 }}>Onboarding Pipeline</Label>
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>
          {inProgress} in progress · {total} total
        </div>
      </div>

      {/* Stage rail */}
      <div style={{ display: "flex", gap: compact ? 6 : 8, flexWrap: "wrap", marginBottom: activeStage ? 16 : 0 }}>
        {stages.map((s, i) => {
          const count = counts[s.key] || 0;
          const isActive = activeStage === s.key;
          return (
            <button key={s.key} onClick={() => setActiveStage(isActive ? null : s.key)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: compact ? "8px 10px" : "10px 14px",
                background: isActive ? `${s.color}18` : count > 0 ? "#fff" : "#FAFBFD",
                border: `1.5px solid ${isActive ? s.color : count > 0 ? `${s.color}40` : C.border}`,
                borderRadius: 10, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", minWidth: compact ? 60 : 72, flex: "1 1 auto" }}>
              <div style={{ fontSize: compact ? 16 : 18 }}>{s.icon}</div>
              <div style={{ fontSize: count > 0 ? (compact ? 18 : 22) : (compact ? 14 : 18), fontWeight: 900, color: count > 0 ? s.color : C.textMuted, lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 10, color: isActive ? s.color : C.textMuted, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{s.label}</div>
            </button>
          );
        })}
      </div>

      {/* Drill-down list */}
      {activeStage && (
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: activeInfo?.color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            {activeInfo?.label} — {drillPeople.length} {drillPeople.length === 1 ? "person" : "people"}
          </div>
          {drillPeople.length === 0 ? (
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>No one at this stage.</p>
          ) : (
            drillPeople.map((p, i) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0",
                borderBottom: i < drillPeople.length - 1 ? `1px solid ${C.border}` : "none", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>{p.full_name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    {p.role_title}{p.start_date ? ` · Started ${new Date(p.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                    {p.startDays !== null && p.startDays >= 0 ? ` · Day ${p.startDays}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {p.email && (
                    <a href={`mailto:${p.email}`}
                      style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: `${activeInfo?.color}12`, color: activeInfo?.color, border: `1px solid ${activeInfo?.color}30`, textDecoration: "none" }}>
                      Email
                    </a>
                  )}
                  {onNavigate && (
                    <button onClick={() => onNavigate("employee")}
                      style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: `${C.teal}12`, color: C.teal, border: `1px solid ${C.teal}30`, cursor: "pointer", fontFamily: "inherit" }}>
                      View Profile →
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function OnboardingConcierge({ onNavigate }) {
  const [onboardingEmployees, setOnboardingEmployees] = useState([]);
  const { ask, loading, response, setResponse } = useAI();
  const [draft, setDraft] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [hireDesc, setHireDesc] = useState("");
  const [recipients, setRecipients] = useState({ hiringManager: true, newHire: true });

  useEffect(() => {
    async function loadOnboarding() {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const { data: docs } = await supabase
        .from("employee_onboarding_docs")
        .select("*, employees(full_name, role_title, start_date, email)");
      const filtered = (docs || []).filter(d =>
        d.status !== "complete" || (d.employees?.start_date && d.employees.start_date >= thirtyDaysAgo)
      );
      const seen = new Set();
      setOnboardingEmployees(filtered.filter(d => {
        if (seen.has(d.employee_id)) return false;
        seen.add(d.employee_id);
        return true;
      }));
    }
    loadOnboarding();
  }, []);

  // When AI finishes, move response into draft for editing
  useEffect(() => {
    if (response && !loading) {
      setDraft(response);
      setEditMode(false);
      setSent(false);
    }
  }, [response, loading]);

  const sys = `You are QumulusAI's Onboarding Concierge. Generate a personalized 30-60-90 day plan for the new hire described. Include specific milestones, key meetings, deliverables, and success criteria for each phase. Use clear markdown formatting with ## headings, bullet lists, and tables where appropriate.`;

  async function generate(prompt) {
    setDraft("");
    setSent(false);
    setEditMode(false);
    await ask(sys, prompt);
  }

  async function sendPlan() {
    if (!draft.trim() || (!recipients.hiringManager && !recipients.newHire)) return;
    setSending(true);
    const slug = hireDesc.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    const date = new Date().toISOString().split("T")[0];
    const inserts = [];
    if (recipients.newHire) inserts.push({ channel: `onboarding-${slug}-${date}`, content: draft, sender_name: "Hiring Manager", sent_at: new Date().toISOString() });
    if (recipients.hiringManager) inserts.push({ channel: `hiring-manager-${slug}-${date}`, content: draft, sender_name: "QumulusAI", sent_at: new Date().toISOString() });
    if (inserts.length) await supabase.from("messages").insert(inserts);
    setSending(false);
    setSent(true);
  }

  return (
    <div>
      <SectionHeader icon="◎" accent={C.teal} title="AI Onboarding Concierge" subtitle="Live onboarding tracker and AI-powered 30-60-90 plans." />

      <OnboardingTracker onNavigate={onNavigate} />

      {onboardingEmployees.length > 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <Label color={C.teal}>Currently Onboarding</Label>
          {onboardingEmployees.map((doc, i) => {
            const emp = doc.employees;
            if (!emp) return null;
            const docStatus = doc.w4_signed_at && doc.dd_signed_at && doc.i9_signed_at ? "complete" : "pending";
            return (
              <div key={i} style={{ padding: "12px 0", borderBottom: i < onboardingEmployees.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.textDark }}>{emp.full_name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{emp.role_title} · Start: {emp.start_date || "—"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 10px", background: docStatus === "complete" ? "#ECFDF5" : "#FFFBEB", color: docStatus === "complete" ? "#059669" : "#D97706" }}>
                      {docStatus === "complete" ? "✅ Docs Complete" : "⏳ Docs Pending"}
                    </span>
                    <button
                      onClick={() => { setHireDesc(emp.full_name); generate(`Generate a 30-60-90 day onboarding plan for ${emp.full_name}, ${emp.role_title} at QumulusAI, starting ${emp.start_date || "soon"}.`); }}
                      style={{ background: `${C.teal}15`, border: `1px solid ${C.teal}30`, borderRadius: 6, padding: "5px 12px", fontSize: 11, color: C.teal, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, minHeight: 30 }}>
                      ✦ Generate 30-60-90
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      ) : (
        <Card style={{ marginBottom: 14 }}>
          <Label color={C.teal}>Currently Onboarding</Label>
          <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>No active onboarding employees right now.</p>
        </Card>
      )}

      <Card style={{ marginBottom: draft ? 14 : 0 }}>
        <Label color={C.teal}>Generate Personalized Onboarding Plan</Label>
        <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>Describe a new hire and QumulusAI builds their complete 90-day onboarding journey instantly.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 4 }}>
          {[
            "New hire: Sarah Chen, VP Engineering, starting Monday, will manage 40 engineers",
            "New hire: Marcus Webb, Enterprise AE, Chicago office, first SaaS role",
            "New hire: Aiko Tanaka, Senior Data Scientist, PhD ML from MIT",
          ].map(q => <Chip key={q} label={q.slice(0, 46) + "…"} accent={C.teal} onClick={() => { setHireDesc(q); generate(q); }} />)}
        </div>
        <AIInput placeholder="Describe the new hire — role, team, location, background…" onSubmit={q => { setHireDesc(q); generate(q); }} loading={loading} accent={C.teal} />
        {loading && (
          <div style={{ marginTop: 14, color: C.teal, fontSize: 13, fontWeight: 600 }}>◈ QumulusAI is building the onboarding plan…</div>
        )}
      </Card>

      {draft && !loading && (
        <Card>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <Label color={C.teal} style={{ marginBottom: 4 }}>Review & Send Plan</Label>
              <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>Review the plan below, edit if needed, then choose recipients.</p>
            </div>
            <button onClick={() => setEditMode(e => !e)}
              style={{ background: editMode ? `${C.teal}20` : C.bg, border: `1px solid ${C.teal}40`, borderRadius: 6, padding: "6px 14px", fontSize: 12, color: C.teal, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, whiteSpace: "nowrap" }}>
              {editMode ? "◎ Preview" : "✏ Edit"}
            </button>
          </div>

          {/* Plan preview or editor */}
          {editMode ? (
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", minHeight: 380, padding: "14px 16px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, lineHeight: 1.8, color: C.textDark, background: "#FAFBFD", resize: "vertical", outline: "none", fontFamily: "monospace" }}
            />
          ) : (
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 24px", maxHeight: 500, overflowY: "auto" }}>
              {renderMarkdown(draft)}
            </div>
          )}

          {/* Recipient picker + send */}
          <div style={{ marginTop: 16, padding: "14px 16px", background: "#F8FAFD", border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Send To</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { key: "hiringManager", label: "Hiring Manager" },
                  { key: "newHire", label: "New Hire" },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, color: C.textDark, fontWeight: 500,
                    background: recipients[key] ? `${C.teal}12` : C.bg,
                    border: `1px solid ${recipients[key] ? C.teal : C.border}`,
                    borderRadius: 8, padding: "7px 14px", transition: "all 0.15s" }}>
                    <input type="checkbox" checked={recipients[key]} onChange={e => setRecipients(r => ({ ...r, [key]: e.target.checked }))}
                      style={{ accentColor: C.teal, width: 15, height: 15, cursor: "pointer" }} />
                    {label}
                  </label>
                ))}
              </div>
              <button
                onClick={sendPlan}
                disabled={sending || sent || (!recipients.hiringManager && !recipients.newHire)}
                style={{ background: sent ? "#059669" : C.teal, border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, color: "#fff", cursor: (sending || sent || (!recipients.hiringManager && !recipients.newHire)) ? "default" : "pointer", fontFamily: "inherit", fontWeight: 700, opacity: (sending || (!recipients.hiringManager && !recipients.newHire)) ? 0.6 : 1, whiteSpace: "nowrap" }}>
                {sent ? "✓ Sent" : sending ? "Sending…" : "Send Plan →"}
              </button>
            </div>
          </div>

          {sent && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "#ECFDF5", border: "1px solid #BBF7D0", borderRadius: 8, fontSize: 13, color: "#059669", fontWeight: 600 }}>
              ✓ Plan delivered to {[recipients.hiringManager && "Hiring Manager", recipients.newHire && "New Hire"].filter(Boolean).join(" & ")} via Messenger.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── MANAGER COACH ────────────────────────────────────────────────────────────
function ManagerCoach() {
  const { ask, loading, response } = useAI();
  const { isMobile } = useBreakpoint();

  const sys = "You are an AI People Operations assistant for QumulusAI — a vertically integrated AI infrastructure company based in Marietta, Georgia. QumulusAI provides bare-metal GPU cloud services and is scaling rapidly from 18 to 300+ employees after securing $500M in financing. CEO is Mike Maniscalco. The company's mission is to universalize access to AI compute. Roles are highly technical: GPU Infrastructure Engineers, AI Solutions Architects, Data Center Operations, Enterprise Sales. You are their AI Manager Coach. Give specific, actionable leadership advice. Be empathetic but direct. Under 200 words.";

  const chips = [
    "Help me prepare for Sofia's performance review — she's underperforming but has high potential",
    "Draft a PIP for an engineer who's been missing deadlines",
    "One of my senior reports told me they're thinking of leaving",
    "How do I give feedback on communication style without it feeling personal?",
  ];

  return (
    <div>
      <SectionHeader icon="◇" accent={C.blue} title="AI Manager Coach" subtitle="Your AI leadership partner — preparation, coaching, documentation, and team intelligence." />

      <Card style={{ marginBottom: 14 }}>
        <Label color={C.blue}>Team Health — Direct Reports</Label>

        {/* Card view on mobile, table view on desktop */}
        {isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {EMPLOYEES.map(e => (
              <div key={e.name} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.textDark }}>{e.name}</div>
                    <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{e.role}</div>
                    <div style={{ color: C.textMuted, fontSize: 11, marginTop: 1 }}>{e.tenure}</div>
                  </div>
                  <Badge label={e.risk} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>Sentiment</span>
                  <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3 }}>
                    <div style={{ width: `${e.sentiment}%`, height: "100%", borderRadius: 3, background: e.sentiment > 70 ? C.emerald : e.sentiment > 50 ? C.amber : C.rose }} />
                  </div>
                  <span style={{ color: C.textDark, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{e.sentiment}</span>
                </div>
                <button
                  onClick={() => ask(sys, `My direct report ${e.name} (${e.role}, ${e.tenure} tenure) has a sentiment score of ${e.sentiment}/100 and is a ${e.risk} flight risk. Give me specific actions to take this week.`)}
                  style={{ width: "100%", background: `${C.blue}12`, border: `1px solid ${C.blue}30`, borderRadius: 8, padding: "11px", fontSize: 13, color: C.blue, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, minHeight: 44 }}>
                  ◇ Coach me on {e.name.split(" ")[0]}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>{["Name","Role","Tenure","Sentiment","Flight Risk","Action"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: C.textMuted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {EMPLOYEES.map(e => (
                  <tr key={e.name} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px", color: C.textDark, fontWeight: 600 }}>{e.name}</td>
                    <td style={{ padding: "10px", color: C.textMid }}>{e.role}</td>
                    <td style={{ padding: "10px", color: C.textMuted }}>{e.tenure}</td>
                    <td style={{ padding: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 60, height: 5, background: C.border, borderRadius: 3 }}>
                          <div style={{ width: `${e.sentiment}%`, height: "100%", borderRadius: 3, background: e.sentiment > 70 ? C.emerald : e.sentiment > 50 ? C.amber : C.rose }} />
                        </div>
                        <span style={{ color: C.textDark, fontSize: 12 }}>{e.sentiment}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px" }}><Badge label={e.risk} /></td>
                    <td style={{ padding: "10px" }}>
                      <button onClick={() => ask(sys, `My direct report ${e.name} (${e.role}, ${e.tenure} tenure) has a sentiment score of ${e.sentiment}/100 and is a ${e.risk} flight risk. Give me specific actions to take this week.`)}
                        style={{ background: `${C.blue}12`, border: `1px solid ${C.blue}30`, borderRadius: 5, padding: "4px 10px", fontSize: 11, color: C.blue, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                        Coach me
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AIBox loading={loading} response={response} accent={C.blue} />
      </Card>

      <Card>
        <Label color={C.blue}>Ask Your Coach</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
          {chips.map(q => <Chip key={q} label={isMobile ? q.slice(0, 38) + "…" : q.slice(0, 50) + "…"} accent={C.blue} onClick={() => ask(sys, q)} />)}
        </div>
        <AIInput placeholder="Ask about feedback, performance, difficult conversations…" onSubmit={q => ask(sys, q)} loading={loading} accent={C.blue} />
      </Card>
    </div>
  );
}

// ─── EMPLOYEE HUB ─────────────────────────────────────────────────────────────
function EmployeeHub() {
  const { ask, loading, response } = useAI();
  const { isMobile } = useBreakpoint();
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState("");
  const [perfNote, setPerfNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  useEffect(() => {
    supabase.from("employees").select("*").eq("status", "active")
      .then(({ data }) => setEmployees(data || []));
  }, []);

  useEffect(() => {
    if (!selectedEmp) return;
    supabase.from("goals").select("*").eq("employee_id", selectedEmp.id)
      .then(({ data }) => setGoals(data || []));
  }, [selectedEmp]);

  async function toggleGoal(goal) {
    const newStatus = goal.status === "completed" ? "in_progress" : "completed";
    await supabase.from("goals").update({ status: newStatus }).eq("id", goal.id);
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: newStatus } : g));
  }

  async function addGoal() {
    if (!newGoal.trim() || !selectedEmp) return;
    const { data } = await supabase.from("goals").insert({
      employee_id: selectedEmp.id,
      organization_id: "00000000-0000-0000-0000-000000000001",
      title: newGoal,
      status: "in_progress",
    }).select().single();
    if (data) setGoals(prev => [...prev, data]);
    setNewGoal("");
  }

  async function saveNote() {
    if (!perfNote.trim() || !selectedEmp) return;
    setSavingNote(true);
    await supabase.from("performance_reviews").insert({
      employee_id: selectedEmp.id,
      organization_id: "00000000-0000-0000-0000-000000000001",
      summary: perfNote,
      status: "draft",
    });
    setSavingNote(false);
    setSavedNote(true);
    setPerfNote("");
    setTimeout(() => setSavedNote(false), 3000);
  }

  const sys = "You are QumulusAI's HR assistant. Answer employee HR questions clearly and specifically. Be warm, helpful, and under 150 words.";
  const chips = ["What's my PTO balance and how do I request time off?", "Explain our parental leave policy", "How do I update my 401k contribution?", "What internal roles are open that match my background?"];

  return (
    <div>
      <SectionHeader icon="○" accent={C.blueLight} title="Employee Hub & Performance" subtitle="Performance reviews, goal tracking, and instant HR answers." />

      <Card style={{ marginBottom: 14 }}>
        <Label color={C.blueLight}>Team Roster</Label>
        {employees.length === 0
          ? <p style={{ color: C.textMuted, fontSize: 13 }}>Loading employees…</p>
          : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {employees.map(emp => {
                const initials = emp.full_name ? emp.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";
                const tenure = emp.start_date ? Math.round((new Date() - new Date(emp.start_date)) / (365.25 * 86400000) * 10) / 10 : null;
                return (
                  <div key={emp.id}
                    onClick={() => setSelectedEmp(emp)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: `1px solid ${selectedEmp?.id === emp.id ? C.blueLight : C.border}`, background: selectedEmp?.id === emp.id ? `${C.blueLight}08` : C.bg, cursor: "pointer" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${C.blueLight}20`, color: C.blueLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{initials}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.full_name}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.role_title}</div>
                      {tenure !== null && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{tenure} yr{tenure !== 1 ? "s" : ""}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <Label color={C.blueLight}>Performance Review</Label>
        <select
          value={selectedEmp?.id || ""}
          onChange={e => setSelectedEmp(employees.find(emp => emp.id === e.target.value) || null)}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 16, fontSize: 13, color: C.textDark, background: C.bg, outline: "none", fontFamily: "inherit" }}>
          <option value="">Select an employee...</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.full_name} — {emp.role_title}</option>
          ))}
        </select>

        {selectedEmp && (
          <>
            <Label color={C.blueLight}>Goals — {selectedEmp.full_name}</Label>
            {goals.length === 0 && <p style={{ color: C.textMuted, fontSize: 13 }}>No goals yet.</p>}
            {goals.map(goal => (
              <div key={goal.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <button onClick={() => toggleGoal(goal)} style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${goal.status === "completed" ? C.emerald : C.border}`, background: goal.status === "completed" ? C.emerald : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                  {goal.status === "completed" && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}
                </button>
                <span style={{ fontSize: 13, color: C.textDark, textDecoration: goal.status === "completed" ? "line-through" : "none", flex: 1 }}>{goal.title}</span>
                <span style={{ fontSize: 11, color: goal.status === "completed" ? C.emerald : C.amber, fontWeight: 600 }}>{goal.status === "completed" ? "Done" : "In Progress"}</span>
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input value={newGoal} onChange={e => setNewGoal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addGoal(); }}
                placeholder="Add a new goal..."
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.textDark, background: C.bg, outline: "none", fontFamily: "inherit" }} />
              <button onClick={addGoal} style={{ background: C.blueLight, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Add</button>
            </div>

            <div style={{ marginTop: 16 }}>
              <Label color={C.blueLight}>Performance Note</Label>
              <textarea value={perfNote} onChange={e => setPerfNote(e.target.value)}
                placeholder="Write a performance note, feedback, or review..."
                style={{ width: "100%", boxSizing: "border-box", height: 100, padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.textDark, background: C.bg, resize: "vertical", outline: "none", fontFamily: "inherit" }} />
              <button onClick={saveNote} disabled={savingNote || !perfNote.trim()}
                style={{ marginTop: 8, background: C.blueLight, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: (savingNote || !perfNote.trim()) ? "default" : "pointer", opacity: (savingNote || !perfNote.trim()) ? 0.6 : 1, fontFamily: "inherit" }}>
                {savedNote ? "✓ Saved!" : savingNote ? "Saving..." : "Save Note"}
              </button>
            </div>
          </>
        )}
      </Card>

      <Card>
        <Label color={C.blueLight}>Ask HR Anything</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 4 }}>
          {chips.map(q => <Chip key={q} label={q} accent={C.blueLight} onClick={() => ask(sys, q)} />)}
        </div>
        <AIInput placeholder="Ask about PTO, benefits, payroll, career, policies…" onSubmit={q => ask(sys, q)} loading={loading} accent={C.blueLight} />
        <AIBox loading={loading} response={response} accent={C.blueLight} />
      </Card>
    </div>
  );
}

// ─── WORKFORCE INTEL ──────────────────────────────────────────────────────────
function WorkforceIntel({ onNavigate }) {
  const { ask, loading, response } = useAI();
  const { isMobile } = useBreakpoint();

  const sys = "You are an AI People Operations assistant for QumulusAI — a vertically integrated AI infrastructure company based in Marietta, Georgia. QumulusAI provides bare-metal GPU cloud services and is scaling rapidly from 18 to 300+ employees after securing $500M in financing. CEO is Mike Maniscalco. The company's mission is to universalize access to AI compute. Roles are highly technical: GPU Infrastructure Engineers, AI Solutions Architects, Data Center Operations, Enterprise Sales. You are their Workforce Intelligence engine advising the CEO and incoming CHRO. Provide strategic, data-driven insights. Be direct and predictive. Under 200 words.";
  const chips = [
    "Our Sales attrition is 29% — what's the strategic risk and what do we do?",
    "Should we hire or upskill for AI roles given our current team?",
    "Forecast headcount and labor cost for scaling to 600 employees",
    "Build a succession plan framework for our VP-level roles",
  ];

  const attritionData = [
    { dept: "Infrastructure", risk: 18, headcount: 14 },
    { dept: "Sales",          risk: 31, headcount: 8  },
    { dept: "Solutions Eng",  risk: 12, headcount: 7  },
    { dept: "DC Operations",  risk: 24, headcount: 6  },
    { dept: "G&A / Finance",  risk: 8,  headcount: 8  },
  ];

  return (
    <div>
      <SectionHeader icon="◆" accent={C.amber} title="Workforce Intelligence" subtitle="Predictive dashboards, attrition signals, headcount planning, and AI-generated executive recommendations." />

      <OnboardingTracker onNavigate={onNavigate} compact={true} />

      {/* KPI grid — 2 cols on mobile, auto-fit on desktop */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
        {METRICS.map(m => (
          <button key={m.label} onClick={() => onNavigate && onNavigate(m.page)}
            style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: isMobile ? 14 : 16, textAlign: "center", cursor: onNavigate ? "pointer" : "default", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.boxShadow = `0 2px 8px ${C.amber}20`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontSize: isMobile ? 22 : 24, fontWeight: 900, color: C.textDark, letterSpacing: "-0.02em" }}>{m.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: m.trend === "up" ? C.emerald : C.rose }}>{m.trend === "up" ? "↑" : "↓"} {m.delta}</div>
          </button>
        ))}
      </div>

      {/* Attrition by dept */}
      <Card style={{ marginBottom: 14 }}>
        <Label color={C.amber}>Attrition Risk by Department</Label>
        {attritionData.map(d => (
          <div key={d.dept} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: C.textMid, fontWeight: 500 }}>{d.dept}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: C.textDark, fontWeight: 700 }}>{d.risk}%</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{d.headcount} hc</span>
              </div>
            </div>
            <div style={{ height: 7, background: C.border, borderRadius: 4 }}>
              <div style={{ width: `${Math.min(d.risk * 2.8, 100)}%`, height: "100%", borderRadius: 4, background: d.risk > 25 ? C.rose : d.risk > 15 ? C.amber : C.emerald }} />
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <Label color={C.amber}>Strategic Intelligence</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
          {chips.map(q => <Chip key={q} label={isMobile ? q.slice(0, 38) + "…" : q.slice(0, 50) + "…"} accent={C.amber} onClick={() => ask(sys, q)} />)}
        </div>
        <AIInput placeholder="Ask about workforce planning, attrition, succession, org health…" onSubmit={q => ask(sys, q)} loading={loading} accent={C.amber} />
        <AIBox loading={loading} response={response} accent={C.amber} />
      </Card>
    </div>
  );
}

// ─── LOGIN BANNER ─────────────────────────────────────────────────────────────
function LoginBanner({ onDismiss }) {
  const prev = getPreviousLogin();
  if (!prev) return null;
  return (
    <div style={{ background: "#0A1628", border: "1px solid #1E3A5F", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, boxSizing: "border-box" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#4B8FCC", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
          {prev.isNewDevice ? "⚠ New Device Detected" : "✓ Last Successful Login"}
        </div>
        <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.5 }}>
          {prev.date} at {prev.time} · {prev.browser} on {prev.os}
          {prev.isNewDevice && (
            <span style={{ display: "block", marginTop: 3, color: "#F59E0B", fontSize: 12 }}>
              A new device was used to sign in. If this wasn't you, go to Security and sign out all devices.
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ background: "none", border: "none", color: "#4B5A6E", cursor: "pointer", fontSize: 18, lineHeight: 1, flexShrink: 0, padding: "0 4px", minHeight: 28, display: "flex", alignItems: "center" }}>
        ✕
      </button>
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("home");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [onboardingCount, setOnboardingCount] = useState(0);
  const [groupsOpen, setGroupsOpen] = useState({ executive: true, talent: true, people: true, operations: true, communication: true });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLoginBanner, setShowLoginBanner] = useState(() => {
    // Only show the banner immediately after a fresh sign-in, not on page refresh
    const fresh = sessionStorage.getItem("qai_fresh_login");
    if (fresh) sessionStorage.removeItem("qai_fresh_login");
    return fresh === "1";
  });
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    // "Remember me = false" — sign out if browser was closed (sessionStorage cleared)
    if (localStorage.getItem("qai_no_persist") === "1" && !sessionStorage.getItem("qai_active_session")) {
      localStorage.removeItem("qai_no_persist");
      supabase.auth.signOut().then(() => setAuthLoading(false));
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // onAuthStateChange handles auto-logout when token refresh fails (SIGNED_OUT event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      supabase.from("profiles").select("role").eq("id", session.user.id).single()
        .then(({ data }) => setUserRole(data?.role || "recruiter"));
    }
  }, [session]);

  useEffect(() => {
    supabase.from("messages").select("channel").like("channel", "onboarding-%")
      .then(({ data }) => {
        if (!data) return;
        setOnboardingCount(new Set(data.map(m => m.channel)).size);
      });
  }, []);

  // Close drawer on navigation (mobile)
  function navigate(id) {
    setActive(id);
    setSidebarOpen(false);
  }

  if (authLoading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0F", color: "#E8E8F0" }}>Loading…</div>;
  if (!session) return <Auth onAuth={() => supabase.auth.getSession()} />;

  const params = new URLSearchParams(window.location.search);
  const signingToken = params.get("sign");
  if (signingToken) return <OfferSigning token={signingToken} />;
  const onboardToken = params.get("onboard");
  if (onboardToken) return <NewHirePortal token={onboardToken} />;
  const assessToken = params.get("assess");
  if (assessToken) return <AssessmentPortal token={assessToken} />;
  if (session && userRole === "employee") return <EmployeePortal user={session.user} />;

  const screens = {
    home: <CommandCenter userRole={userRole} onNavigate={navigate} />,
    recruit:   <RecruitingEngine />,
    onboard:   <OnboardingConcierge onNavigate={navigate} />,
    manager:   <ManagerCoach />,
    employee:  <EmployeeHub />,
    executive: <WorkforceIntel onNavigate={navigate} />,
    careers:   <CareersPortal />,
    inbox:     <TalentInbox />,
    messenger: <Messenger />,
    payroll:   <Payroll />,
    security:  <SecurityActivity user={session?.user} />,
  };

  const currentPageLabel = NAV.find(n => n.id === active)?.label || "QumulusAI";

  return (
    <div style={{ minHeight: "100vh", display: isMobile ? "block" : "flex", fontFamily: "'Inter', -apple-system, sans-serif", background: C.bg, overflowX: "hidden" }}>

      {/* ── MOBILE: Fixed 56px top bar ── */}
      {isMobile && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, background: C.bgSidebar, display: "flex", alignItems: "center", padding: "0 16px", zIndex: 200, gap: 12, borderBottom: `1px solid ${C.borderDark}`, boxSizing: "border-box" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            style={{ background: "none", border: "none", color: C.textOnDark, fontSize: 22, cursor: "pointer", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            ☰
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.textOnDark, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentPageLabel}
          </span>
          <span style={{ fontWeight: 900, fontSize: 15, color: C.textOnDark, letterSpacing: "-0.02em", flexShrink: 0 }}>
            <span style={{ color: C.cyan }}>Q</span>AI
          </span>
        </div>
      )}

      {/* ── MOBILE: Drawer backdrop ── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, WebkitTapHighlightColor: "transparent" }}
        />
      )}

      {/* ── Sidebar / Slide-out drawer ── */}
      <aside style={{
        width: isMobile ? 280 : 224,
        background: C.bgSidebar,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: isMobile ? "fixed" : "sticky",
        top: 0,
        left: 0,
        height: "100vh",
        zIndex: isMobile ? 400 : "auto",
        transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "none",
        transition: isMobile ? "transform 0.28s cubic-bezier(0.4,0,0.2,1)" : "none",
        overflowY: "auto",
      }}>
        {/* Logo + close */}
        <div style={{ padding: "22px 20px 16px", borderBottom: `1px solid ${C.borderDark}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: C.textOnDark, letterSpacing: "-0.02em" }}>
              <span style={{ color: C.cyan }}>Q</span>umulus<span style={{ color: C.cyan }}>AI</span>
            </div>
            <div style={{ fontSize: 9, color: C.textMutedDark, marginTop: 3, letterSpacing: "0.1em", textTransform: "uppercase" }}>People Operating System</div>
          </div>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
              style={{ background: "none", border: "none", color: C.textMutedDark, fontSize: 22, cursor: "pointer", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ✕
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {NAV_GROUPS.map(group => {
            const open = groupsOpen[group.id] !== false;
            return (
              <div key={group.id} style={{ marginBottom: 4 }}>
                <button
                  onClick={() => setGroupsOpen(prev => ({ ...prev, [group.id]: !open }))}
                  style={{ display: "flex", alignItems: "center", width: "100%", padding: "6px 12px", background: "transparent", border: "none", color: C.textMutedDark, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", userSelect: "none", opacity: 0.7 }}
                >
                  <span style={{ flex: 1, textAlign: "left" }}>{group.label}</span>
                  <span style={{ fontSize: 8, opacity: 0.6, transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }}>▾</span>
                </button>
                {open && group.items.map(n => (
                  <button
                    key={n.id}
                    onClick={() => navigate(n.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 7, marginBottom: 1, background: active === n.id ? C.bgActive : "transparent", border: "none", color: active === n.id ? C.textOnDark : C.textMutedDark, fontSize: 13, fontWeight: active === n.id ? 600 : 400, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.1s", minHeight: 40 }}
                    onMouseEnter={e => { if (active !== n.id) { e.currentTarget.style.background = C.bgSidebarHov; e.currentTarget.style.color = C.textOnDark; } }}
                    onMouseLeave={e => { if (active !== n.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textMutedDark; } }}
                  >
                    <span style={{ fontSize: 13, color: active === n.id ? n.accent : "inherit", flexShrink: 0 }}>{n.icon}</span>
                    <span style={{ flex: 1 }}>{n.label}</span>
                    {n.id === "messenger" && onboardingCount > 0 && (
                      <span style={{ background: "#16A34A", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px", lineHeight: 1.6 }}>{onboardingCount}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 12px 4px", flexShrink: 0 }}>
          {/* User info */}
          <div style={{ background: "#0F1828", border: `1px solid ${C.borderDark}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: C.textMutedDark, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.email}</div>
            <button
              onClick={() => navigate("security")}
              style={{ background: "none", border: "none", color: C.cyan, fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: 0, fontWeight: 600, letterSpacing: "0.04em" }}>
              ⚔ Security &amp; Activity →
            </button>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ width: "100%", background: "transparent", border: `1px solid ${C.borderDark}`, borderRadius: 6, padding: "10px 0", color: C.textMutedDark, fontSize: 12, cursor: "pointer", fontFamily: "inherit", minHeight: 44 }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingTop: isMobile ? 56 : 0, width: "100%", boxSizing: "border-box", minWidth: 0 }}>
        <div style={{ maxWidth: isMobile ? "100%" : 940, margin: "0 auto", padding: isMobile ? "20px 16px" : "36px", boxSizing: "border-box" }}>
          {showLoginBanner && (
            <LoginBanner onDismiss={() => setShowLoginBanner(false)} />
          )}
          {screens[active]}
        </div>
      </main>
    </div>
  );
}
