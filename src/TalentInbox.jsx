import { useState, useEffect, useCallback } from "react";

import { supabase } from "./supabase";



const STATUSES = ["new", "reviewing", "interview", "offer", "rejected", "hired"];



const STATUS_META = {

  new:       { label: "New",       color: "#7B61FF", bg: "#1A1530" },

  reviewing: { label: "Reviewing", color: "#F59E0B", bg: "#1C1608" },

  interview: { label: "Interview", color: "#3B82F6", bg: "#071325" },

  offer:     { label: "Offer",     color: "#10B981", bg: "#061410" },

  rejected:  { label: "Rejected",  color: "#6B6B80", bg: "#111118" },

  hired:     { label: "Hired",     color: "#22C55E", bg: "#071410" },

};



export default function TalentInbox() {

  const [apps, setApps]         = useState([]);

  const [loading, setLoading]   = useState(true);

  const [selected, setSelected] = useState(null);

  const [filter, setFilter]     = useState("all");

  const [search, setSearch]     = useState("");

  const [updating, setUpdating] = useState(null);



  const fetchApps = useCallback(async () => {

    setLoading(true);

    const { data, error } = await supabase

      .from("applications")

      .select("*")

      .order("created_at", { ascending: false });

    if (!error) setApps(data ?? []);

    setLoading(false);

  }, []);



  useEffect(() => { fetchApps(); }, [fetchApps]);



  useEffect(() => {

    const channel = supabase

      .channel("applications_changes")

      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, (payload) => {

        if (payload.eventType === "INSERT") setApps((prev) => [payload.new, ...prev]);

        else if (payload.eventType === "UPDATE") {

          setApps((prev) => prev.map((a) => (a.id === payload.new.id ? payload.new : a)));

          setSelected((s) => (s?.id === payload.new.id ? payload.new : s));

        } else if (payload.eventType === "DELETE") {

          setApps((prev) => prev.filter((a) => a.id !== payload.old.id));

        }

      })

      .subscribe();

    return () => { supabase.removeChannel(channel); };

  }, []);



  async function updateStatus(id, newStatus) {

    setUpdating(id);

    await supabase.from("applications").update({ status: newStatus }).eq("id", id);

    setUpdating(null);

  }



  const visible = apps.filter((a) => {

    const matchStatus = filter === "all" || a.status === filter;

    const q = search.toLowerCase();

    const matchSearch = !q || a.full_name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q) || a.role_title?.toLowerCase().includes(q);

    return matchStatus && matchSearch;

  });



  const counts = STATUSES.reduce((acc, s) => { acc[s] = apps.filter((a) => a.status === s).length; return acc; }, {});



  return (

    <div style={styles.shell}>

      <aside style={styles.sidebar}>

        <div style={styles.sidebarHeader}>

          <span style={styles.wordmark}>Qumulus<span style={styles.ai}>AI</span></span>

          <span style={styles.inboxLabel}>TALENT INBOX</span>

        </div>

        <div style={styles.searchWrap}>

          <input style={styles.search} placeholder="Search applicants…" value={search} onChange={(e) => setSearch(e.target.value)} />

        </div>

        <nav style={styles.nav}>

          <NavItem label="All" count={apps.length} active={filter === "all"} onClick={() => setFilter("all")} color="#7B61FF" />

          {STATUSES.map((s) => (

            <NavItem key={s} label={STATUS_META[s].label} count={counts[s]} active={filter === s} onClick={() => setFilter(s)} color={STATUS_META[s].color} />

          ))}

        </nav>

      </aside>



      <main style={styles.list}>

        <div style={styles.listHeader}>

          <span style={styles.listCount}>{loading ? "Loading…" : `${visible.length} application${visible.length !== 1 ? "s" : ""}`}</span>

          <button style={styles.refreshBtn} onClick={fetchApps}>↻ Refresh</button>

        </div>

        {!loading && visible.length === 0 && (

          <div style={styles.empty}>

            <p style={styles.emptyIcon}>✦</p>

            <p style={styles.emptyText}>No applications match this filter.</p>

          </div>

        )}

        {visible.map((app) => (

          <ApplicationRow key={app.id} app={app} selected={selected?.id === app.id} onClick={() => setSelected(app)} />

        ))}

      </main>



      <aside style={styles.detail}>

        {!selected ? (

          <div style={styles.empty}>

            <p style={styles.emptyIcon}>→</p>

            <p style={styles.emptyText}>Select an application to review it.</p>

          </div>

        ) : (

          <DetailPanel app={selected} onUpdateStatus={updateStatus} updating={updating === selected.id} />

        )}

      </aside>

    </div>

  );

}



function NavItem({ label, count, active, onClick, color }) {

  return (

    <button onClick={onClick} style={{ ...styles.navItem, ...(active ? { background: "#1A1530", color: "#E8E8F0" } : {}) }}>

      <span>{label}</span>

      <span style={{ ...styles.badge, background: active ? color : "#1E1E2E", color: active ? "#fff" : "#6B6B80" }}>{count}</span>

    </button>

  );

}



function ApplicationRow({ app, selected, onClick }) {

  const m = STATUS_META[app.status] ?? STATUS_META.new;

  const date = new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (

    <div onClick={onClick} style={{ ...styles.row, ...(selected ? styles.rowSelected : {}) }}>

      <div style={styles.rowAvatar}>{initials(app.full_name)}</div>

      <div style={styles.rowBody}>

        <div style={styles.rowTop}>

          <span style={styles.rowName}>{app.full_name}</span>

          <span style={{ ...styles.statusPill, background: m.bg, color: m.color }}>{m.label}</span>

        </div>

        <div style={styles.rowMeta}>

          <span>{app.role_title}</span>

          <span style={{ color: "#3B3B50" }}>·</span>

          <span>{date}</span>

        </div>

      </div>

    </div>

  );

}



function DetailPanel({ app, onUpdateStatus, updating }) {

  const m = STATUS_META[app.status] ?? STATUS_META.new;

  const date = new Date(app.created_at).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (

    <div style={styles.detailInner}>

      <div style={styles.detailHeader}>

        <div style={styles.detailAvatar}>{initials(app.full_name)}</div>

        <div>

          <h2 style={styles.detailName}>{app.full_name}</h2>

          <p style={styles.detailRole}>{app.role_title} · {app.department}</p>

        </div>

      </div>

      <div style={{ ...styles.statusBadge, background: m.bg, color: m.color }}>{m.label}</div>

      <Section title="Contact">

        <DetailRow label="Email" value={<a href={`mailto:${app.email}`} style={styles.link}>{app.email}</a>} />

        {app.phone && <DetailRow label="Phone" value={app.phone} />}

        {app.linkedin_url && <DetailRow label="LinkedIn" value={<a href={app.linkedin_url} target="_blank" rel="noreferrer" style={styles.link}>View profile</a>} />}

        <DetailRow label="Applied" value={date} />

      </Section>

      {app.cover_letter && (

        <Section title="Cover Letter">

          <p style={styles.coverLetter}>{app.cover_letter}</p>

        </Section>

      )}

      {app.status === "interview" && <ScheduleInterview app={app} />}

      {app.status === "offer" && <OfferLetter app={app} />}

      <Section title="Move Pipeline">

        <div style={styles.pipelineGrid}>

          {STATUSES.map((s) => {

            const sm = STATUS_META[s];

            const active = app.status === s;

            return (

              <button key={s} disabled={active || updating} onClick={() => onUpdateStatus(app.id, s)}

                style={{ ...styles.pipeBtn, ...(active ? { background: sm.bg, color: sm.color, borderColor: sm.color } : {}), opacity: updating ? 0.5 : 1 }}>

                {sm.label}

              </button>

            );

          })}

        </div>

      </Section>

    </div>

  );

}



function Section({ title, children }) {

  return (

    <div style={styles.section}>

      <p style={styles.sectionLabel}>{title.toUpperCase()}</p>

      {children}

    </div>

  );

}



function ScheduleInterview({ app }) {

  const [date, setDate] = useState("");

  const [time, setTime] = useState("");

  const [interviewer, setInterviewer] = useState("");

  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);



  async function handleSchedule() {

    if (!date || !time || !interviewer) return;

    setSaving(true);

    await supabase.from("interviews").insert({

      application_id: app.id,

      candidate_name: app.full_name,

      role: app.role_title,

      interviewer, date, time, notes,

    });

    setSaving(false);

    setSaved(true);

    setTimeout(() => setSaved(false), 3000);

  }



  return (

    <Section title="Schedule Interview">

      <input style={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />

      <input style={styles.input} type="time" value={time} onChange={e => setTime(e.target.value)} />

      <input style={styles.input} placeholder="Interviewer name" value={interviewer} onChange={e => setInterviewer(e.target.value)} />

      <textarea style={{...styles.input, height: 80, resize: "vertical"}} placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />

      <button style={{...styles.pipeBtn, background: "#1A1530", color: "#7B61FF", borderColor: "#7B61FF"}} onClick={handleSchedule} disabled={saving}>

        {saved ? "✓ Scheduled!" : saving ? "Saving…" : "Schedule Interview"}

      </button>

    </Section>

  );

}



function OfferLetter({ app }) {

  const [salary, setSalary] = useState("");

  const [startDate, setStartDate] = useState("");

  const [letter, setLetter] = useState("");

  const [generating, setGenerating] = useState(false);

  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);



  async function generateLetter() {

    if (!salary || !startDate) return;

    setGenerating(true);

    const res = await fetch("https://api.anthropic.com/v1/messages", {

      method: "POST",
      headers: { "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY, 
      "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },

  
 

      body: JSON.stringify({

        model: "claude-sonnet-4-6", max_tokens: 1000,

        messages: [{ role: "user", content: `Write a professional offer letter for ${app.full_name} for the role of ${app.role_title} in the ${app.department} department at QumulusAI. Salary: ${salary}. Start date: ${startDate}. Keep it warm, professional, and concise.` }]

      })

    });

    const data = await res.json();

    setLetter(data.content?.[0]?.text || "");

    setGenerating(false);

  }



  async function saveOffer() {

    setSaving(true);

    await supabase.from("offers").insert({

      application_id: app.id,

      candidate_name: app.full_name,

      role: app.role_title,

      department: app.department,

      salary, start_date: startDate, letter

    });

    setSaving(false);

    setSaved(true);

    setTimeout(() => setSaved(false), 3000);

  }



  return (

    <Section title="Generate Offer Letter">

      <input style={styles.input} placeholder="Salary (e.g. $120,000)" value={salary} onChange={e => setSalary(e.target.value)} />

      <input style={styles.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />

      <button style={{...styles.pipeBtn, background: "#061410", color: "#10B981", borderColor: "#10B981"}} onClick={generateLetter} disabled={generating}>

        {generating ? "Generating…" : "✦ Generate with AI"}

      </button>

      {letter && (

        <>

          <textarea style={{...styles.input, height: 200, resize: "vertical", marginTop: 8}} value={letter} onChange={e => setLetter(e.target.value)} />

          <button style={{...styles.pipeBtn, background: "#061410", color: "#10B981", borderColor: "#10B981"}} onClick={saveOffer} disabled={saving}>

            {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Offer Letter"}

          </button>

        </>

      )}

    </Section>

  );

}



function DetailRow({ label, value }) {

  return (

    <div style={styles.detailRow}>

      <span style={styles.detailLabel}>{label}</span>

      <span style={styles.detailValue}>{value}</span>

    </div>

  );

}



function initials(name = "") {

  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

}



const C = { bg: "#0A0A0F", surface: "#111118", border: "#1E1E2E", accent: "#7B61FF", text: "#E8E8F0", muted: "#6B6B80" };



const styles = {

  shell: { display: "grid", gridTemplateColumns: "220px 340px 1fr", height: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', 'Helvetica Neue', sans-serif", overflow: "hidden" },

  sidebar: { borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: "#0D0D14" },

  sidebarHeader: { padding: "24px 20px 16px", display: "flex", flexDirection: "column", gap: 4, borderBottom: `1px solid ${C.border}` },

  wordmark: { fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em" },

  ai: { color: C.accent },

  inboxLabel: { fontSize: 11, color: C.muted, fontWeight: 500, letterSpacing: "0.08em" },

  searchWrap: { padding: "16px 12px 8px" },

  search: { width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, outline: "none" },

  nav: { display: "flex", flexDirection: "column", gap: 2, padding: "8px 12px", overflowY: "auto" },

  navItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer", textAlign: "left" },

  badge: { fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "2px 8px", minWidth: 24, textAlign: "center" },

  list: { borderRight: `1px solid ${C.border}`, overflowY: "auto", display: "flex", flexDirection: "column" },

  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.bg, zIndex: 1 },

  listCount: { fontSize: 12, color: C.muted, fontWeight: 500 },

  refreshBtn: { background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, fontSize: 12, padding: "4px 10px", cursor: "pointer" },

  row: { display: "flex", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.1s" },

  rowSelected: { background: "#111130" },

  rowAvatar: { width: 36, height: 36, borderRadius: "50%", background: "#1A1530", color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },

  rowBody: { flex: 1, minWidth: 0 },

  rowTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },

  rowName: { fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },

  rowMeta: { fontSize: 12, color: C.muted, display: "flex", gap: 6 },

  statusPill: { fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "2px 8px", flexShrink: 0 },

  detail: { overflowY: "auto" },

  detailInner: { padding: 32, display: "flex", flexDirection: "column", gap: 28 },

  detailHeader: { display: "flex", gap: 16, alignItems: "center" },

  detailAvatar: { width: 52, height: 52, borderRadius: "50%", background: "#1A1530", color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0 },

  detailName: { fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" },

  detailRole: { fontSize: 13, color: C.muted, margin: "4px 0 0" },

  statusBadge: { alignSelf: "flex-start", fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "4px 14px" },

  section: { display: "flex", flexDirection: "column", gap: 12 },

  sectionLabel: { fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: C.muted, margin: 0 },

  detailRow: { display: "flex", gap: 12, fontSize: 14 },

  detailLabel: { color: C.muted, width: 80, flexShrink: 0 },

  detailValue: { color: C.text },

  link: { color: C.accent, textDecoration: "none" },

  coverLetter: { fontSize: 14, lineHeight: 1.7, color: "#C0C0D0", margin: 0 },

  pipelineGrid: { display: "flex", flexWrap: "wrap", gap: 8 },

  pipeBtn: { padding: "8px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: "pointer" },

  input: { background: "#111118", border: "1px solid #1E1E2E", borderRadius: 8, padding: "9px 12px", color: "#E8E8F0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },

  empty: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 48 },

  emptyIcon: { fontSize: 32, color: C.muted, margin: 0 },

  emptyText: { fontSize: 14, color: C.muted, margin: 0, textAlign: "center" },

};

