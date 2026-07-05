import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import * as T from "./theme";

// Which training courses apply to this employee (mirror of the HR-side rule,
// simplified: 'all' or a title-keyword match; state defaults to GA).
function courseApplies(course, roleTitle, state) {
  if (course.state !== "ALL" && course.state !== (state || "GA")) return false;
  if (course.applies_to === "all") return true;
  const t = (roleTitle || "").toLowerCase();
  return course.applies_to.split(",").some(k => t.includes(k.trim()));
}

const isManager = (title) => /lead|manager|head|director|chief|vp|architect/.test((title || "").toLowerCase());

export default function EmployeePortal({ user }) {
  const [emp, setEmp] = useState(null);
  const [data, setData] = useState({ courses: [], done: new Set(), stub: null, goals: [], team: [], manager: null });
  const [loading, setLoading] = useState(true);
  const [timeOff, setTimeOff] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      const { data: emps } = await supabase.from("employees").select("*").eq("status", "active");
      const me = (emps || []).find(e => e.email?.toLowerCase() === user.email?.toLowerCase())
        || { full_name: prof?.full_name || user.email.split("@")[0], role_title: "Employee", department_id: null, id: null, start_date: null };
      setEmp(me);

      const [{ data: courses }, { data: records }, { data: docs }, { data: goals }] = await Promise.all([
        supabase.from("training_courses").select("*"),
        me.id ? supabase.from("training_records").select("training_name, status").eq("employee_id", me.id) : Promise.resolve({ data: [] }),
        me.id ? supabase.from("employee_onboarding_docs").select("i9_state").eq("employee_id", me.id).limit(1) : Promise.resolve({ data: [] }),
        me.id ? supabase.from("goals").select("title, status, due_date").eq("employee_id", me.id) : Promise.resolve({ data: [] }),
      ]);
      let stub = null, team = [], manager = null;
      if (me.id) {
        const r = await supabase.from("pay_stubs").select("net_pay, pay_date").eq("employee_id", me.id).order("pay_date", { ascending: false }).limit(1);
        stub = (r.data || [])[0] || null;
        if (isManager(me.role_title)) team = (emps || []).filter(e => e.manager_id === me.id);
        if (me.manager_id) manager = (emps || []).find(e => e.id === me.manager_id);
      }
      const state = (docs || [])[0]?.i9_state;
      const applicable = (courses || []).filter(c => courseApplies(c, me.role_title, state));
      const done = new Set((records || []).filter(r => r.status === "completed").map(r => r.training_name));
      setData({ courses: applicable, done, stub, goals: goals || [], team, manager });
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) return <div style={S.loading}>Loading your workspace…</div>;

  const first = (emp.full_name || "there").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const trainingDue = data.courses.filter(c => !data.done.has(c.name));
  const goalsOpen = data.goals.filter(g => g.status !== "completed");
  const priorities = [
    ...trainingDue.map(c => ({ icon: "◈", tone: c.category === "compliance" ? "warn" : "info", title: c.name, sub: "Required training · " + c.frequency })),
    ...goalsOpen.map(g => ({ icon: "◎", tone: "info", title: g.title, sub: g.due_date ? "Goal due " + new Date(g.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Goal in progress" })),
  ];
  const learnDone = data.courses.length - trainingDue.length;
  const money = n => n != null ? "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—";

  return (
    <div style={S.shell}>
      <style>{"@keyframes qai-pulse{0%,100%{opacity:1}50%{opacity:.5}}"}</style>

      {/* Header */}
      <header style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.logo}>Q</div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em", color: T.color.text }}>Qumulus<span style={{ color: T.color.brand }}>AI</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={S.avatar}>{first[0]?.toUpperCase()}</div>
          <button style={S.signout} onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>

      <main style={S.content}>
        {/* Greeting */}
        <div>
          <div style={{ ...T.font.label, color: T.color.textMuted, marginBottom: 6 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
          <h1 style={{ margin: 0, ...T.font.display, color: T.color.text }}>{greeting}, {first}</h1>
          <p style={{ margin: "6px 0 0", color: T.color.textMid, fontSize: 14 }}>{emp.role_title}{data.manager ? " · reports to " + data.manager.full_name : ""}</p>
        </div>

        {/* Priorities */}
        <section style={T.card({ padding: 0, overflow: "hidden" })}>
          <div style={S.cardHead}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={S.sparkle}>✦</div>
              <span style={{ ...T.font.h2, color: T.color.text }}>Your priorities</span>
            </div>
            <span style={T.chipStyle(priorities.length ? "warn" : "good")}>{priorities.length ? priorities.length + " to do" : "All clear"}</span>
          </div>
          {priorities.length === 0 ? (
            <div style={{ padding: "28px 20px", textAlign: "center", color: T.color.textMuted, fontSize: 13 }}>✓ Nothing needs your attention. Nice work.</div>
          ) : priorities.slice(0, 6).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", borderTop: `1px solid ${T.color.border}` }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: p.tone === "warn" ? T.color.amber : T.color.brand, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: T.color.text }}>{p.title}</div>
                <div style={{ fontSize: 12, color: T.color.textMuted }}>{p.sub}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Self-service cards */}
        <div style={S.grid}>
          <Tile label="Learning" value={data.courses.length ? learnDone + "/" + data.courses.length : "—"} sub="courses complete"
            accent={T.color.emerald} progress={data.courses.length ? Math.round((learnDone / data.courses.length) * 100) : 100} />
          <Tile label="Latest Pay" value={data.stub ? money(data.stub.net_pay) : "—"} sub={data.stub ? "net · " + new Date(data.stub.pay_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "no stubs yet"} accent={T.color.teal} />
          <Tile label="Time Off" value="14" sub="days available" accent={T.color.violet} action="Request" onAction={() => setTimeOff(true)} />
          <Tile label="Benefits" value="Enrolled" sub="Medical · Dental · 401(k)" accent={T.color.brand} />
        </div>

        {timeOff && (
          <div style={{ ...T.card(), borderColor: T.color.violet + "40" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ ...T.font.h2, color: T.color.text }}>Request time off</span>
              <button onClick={() => setTimeOff(false)} style={{ background: "none", border: "none", color: T.color.textMuted, cursor: "pointer", fontSize: 13 }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: T.color.textMid, margin: "0 0 12px" }}>You have <strong>14 days</strong> available. Submit a request and your manager{data.manager ? " (" + data.manager.full_name + ")" : ""} will be notified.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="date" style={S.input} />
              <input type="date" style={S.input} />
              <button style={T.btn("primary", { background: T.color.violet })} onClick={() => setTimeOff(false)}>Submit request</button>
            </div>
          </div>
        )}

        {/* Manager-only: your team */}
        {data.team.length > 0 && (
          <section style={T.card()}>
            <div style={{ ...T.font.label, color: T.color.textMuted, marginBottom: 14 }}>Your team · {data.team.length}</div>
            <div style={S.teamGrid}>
              {data.team.map(m => (
                <div key={m.id} style={S.teamMember}>
                  <div style={S.teamAvatar}>{m.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.color.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.full_name}</div>
                    <div style={{ fontSize: 11, color: T.color.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.role_title}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Tile({ label, value, sub, accent, progress, action, onAction }) {
  return (
    <div style={T.card({ padding: "18px 20px" })}>
      <div style={{ ...T.font.label, color: T.color.textMuted, marginBottom: 10 }}>{label}</div>
      <div style={{ ...T.font.h1, color: T.color.text }}>{value}</div>
      <div style={{ fontSize: 12, color: T.color.textMuted, marginTop: 4 }}>{sub}</div>
      {progress != null && (
        <div style={{ height: 6, background: T.color.border, borderRadius: 4, marginTop: 12 }}>
          <div style={{ width: progress + "%", height: "100%", borderRadius: 4, background: accent }} />
        </div>
      )}
      {action && <button onClick={onAction} style={{ marginTop: 12, ...T.btn("secondary", { padding: "6px 12px", fontSize: 12, color: accent, borderColor: accent + "40" }) }}>{action}</button>}
    </div>
  );
}

const S = {
  shell: { minHeight: "100vh", background: T.color.bg, fontFamily: T.font.family },
  loading: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.color.bg, color: T.color.textMuted, fontFamily: T.font.family, fontSize: 14 },
  header: { position: "sticky", top: 0, zIndex: 10, background: "rgba(246,247,249,0.8)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${T.color.border}`, padding: "14px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { width: 30, height: 30, borderRadius: 8, background: T.color.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 },
  avatar: { width: 32, height: 32, borderRadius: "50%", background: T.color.brandSoft, color: T.color.brand, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 },
  signout: { background: "none", border: `1px solid ${T.color.border}`, borderRadius: 8, color: T.color.textMid, fontSize: 12.5, fontWeight: 600, padding: "7px 14px", cursor: "pointer", fontFamily: T.font.family },
  content: { maxWidth: 780, margin: "0 auto", padding: "32px 22px 60px", display: "flex", flexDirection: "column", gap: 18 },
  cardHead: { padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sparkle: { width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${T.color.brand},${T.color.violet})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 },
  input: { background: T.color.surface, border: `1px solid ${T.color.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: T.color.text, outline: "none", fontFamily: T.font.family },
  teamGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 },
  teamMember: { display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", background: T.color.surfaceAlt, borderRadius: 10, border: `1px solid ${T.color.border}` },
  teamAvatar: { width: 30, height: 30, borderRadius: "50%", background: T.color.brandSoft, color: T.color.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
};
