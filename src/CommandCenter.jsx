import { useState, useEffect } from "react";
import { useBreakpoint } from "./useBreakpoint";
import { ensureModulesRegistered, hiringService, workforceService, retentionService, performanceService, financialService, complianceService } from "./services/registerModules";
import { askIntelligenceEngine, getChiefOfStaffBriefing } from "./services/intelligenceEngine";
import { supabase } from "./supabase";

ensureModulesRegistered();

const C = {
  bg: "#F0F2F7", bgCard: "#FFFFFF", textDark: "#0D1117", textMid: "#3D4B5C",
  textMuted: "#7E8FA3", border: "#DDE3ED", cyan: "#00C2E0", navy: "#0A2540",
  blue: "#2563EB", violet: "#7C3AED", teal: "#0D9488", amber: "#D97706",
  rose: "#DC2626", emerald: "#059669",
};

function renderMarkdown(text) {
  if (!text) return null;
  return text.split("\n").map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) return <h3 key={idx} style={{ fontSize: 16, fontWeight: 700, color: C.textDark, margin: "14px 0 6px" }}>{trimmed.slice(3)}</h3>;
    if (trimmed.startsWith("### ")) return <h4 key={idx} style={{ fontSize: 14, fontWeight: 700, color: C.textMid, margin: "10px 0 4px" }}>{trimmed.slice(4)}</h4>;
    if (trimmed === "---") return <hr key={idx} style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "12px 0" }} />;
    if (trimmed === "") return <br key={idx} />;
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
    const formatted = parts.map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i} style={{ fontWeight: 700, color: C.textDark }}>{p.slice(2, -2)}</strong>
        : p
    );
    return <p key={idx} style={{ margin: "4px 0", lineHeight: 1.7 }}>{formatted}</p>;
  });
}

function Card({ children, style, onClick }) {
  return <div onClick={onClick} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22, ...style }}>{children}</div>;
}

function Label({ children, color }) {
  return <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: color || C.textMuted, marginBottom: 14 }}>{children}</div>;
}

function Widget({ label, value, accent, onClick, subtitle }) {
  const [hover, setHover] = useState(false);
  const a = accent || C.cyan;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        background: hover && onClick ? `${a}08` : C.bgCard,
        border: `1px solid ${hover && onClick ? a : C.border}`,
        borderRadius: 10,
        padding: "14px 16px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s ease",
        transform: hover && onClick ? "translateY(-1px)" : "none",
        boxShadow: hover && onClick ? `0 4px 12px ${a}15` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: a, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
        {onClick && <div style={{ fontSize: 10, color: hover ? a : C.textMuted, transition: "color 0.15s" }}>→</div>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.textDark, marginTop: 6 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

function ActionModal({ modal, onClose }) {
  const [msg, setMsg] = useState(modal.defaultMessage);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setSending(true);
    await supabase.from("messages").insert({
      recipient_name: modal.employee,
      content: msg,
      sent_at: new Date().toISOString(),
      type: modal.type,
    });
    setSending(false);
    setSent(true);
    setTimeout(onClose, 1200);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "90%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div onClick={onClose} style={{ float: "right", cursor: "pointer", fontSize: 20, color: C.textMuted }}>&times;</div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: modal.accent || C.cyan, textTransform: "uppercase", marginBottom: 6 }}>{modal.label}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.textDark, marginBottom: 4 }}>{modal.employee}</div>
        {modal.details && <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>{modal.details}</div>}
        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value)}
          rows={6}
          style={{ width: "100%", boxSizing: "border-box", background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px 14px", color: "#0F172A", fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical", fontFamily: "inherit" }}
        />
        <button
          onClick={handleSend}
          disabled={sending || sent}
          style={{ marginTop: 12, background: sent ? C.emerald : (modal.accent || C.cyan), color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: sending ? "default" : "pointer", fontFamily: "inherit" }}
        >{sent ? "✓ Sent!" : sending ? "Sending…" : "Send Message"}</button>
      </div>
    </div>
  );
}

function ClickableName({ name, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: "pointer", textDecoration: hover ? "underline" : "none", color: hover ? "#2563EB" : "inherit", fontWeight: 600 }}
    >{name}</span>
  );
}

function HRAlerts({ onNavigate }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("hr_alerts").select("*").is("read_at", null).order("created_at", { ascending: false }).limit(10);
      setAlerts(data || []);
    }
    load();
  }, []);

  async function markRead(id) {
    await supabase.from("hr_alerts").update({ read_at: new Date().toISOString() }).eq("id", id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  if (!alerts.length) return null;

  const typeIcon = { assessment_sent: "📋", assessment_scored: "◈", default: "🔔" };

  return (
    <Card style={{ borderTop: `3px solid ${C.amber}` }}>
      <Label color={C.amber}>HR Alerts ({alerts.length})</Label>
      {alerts.map(a => (
        <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 16 }}>{typeIcon[a.type] || typeIcon.default}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textDark }}>{a.title}</div>
            {a.body && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{a.body}</div>}
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{new Date(a.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
          </div>
          <button onClick={() => markRead(a.id)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, color: C.textMuted, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>✓ Done</button>
        </div>
      ))}
    </Card>
  );
}

const GREETINGS = {
  ceo: "Good day. Here's your workforce at a glance.",
  executive: "Good day. Here's your workforce at a glance.",
  chro: "Good day. Here's your people intelligence briefing.",
  hr: "Good day. Here's your people intelligence briefing.",
  recruiter: "Good day. Here's your recruiting pipeline.",
  manager: "Good day. Here's your team briefing.",
};

const PLACEHOLDERS = {
  ceo: "Ask about workforce costs, headcount, flight risk, hiring strategy…",
  executive: "Ask about workforce costs, headcount, flight risk, hiring strategy…",
  chro: "Ask about retention, compliance, engagement, recruiting…",
  hr: "Ask about retention, compliance, engagement, recruiting…",
  recruiter: "Ask about pipeline, candidates, interviews, offers…",
  manager: "Ask about my team, goals, performance, 1:1 prep…",
  default: "Ask anything about your workforce…",
};

export default function CommandCenter({ greeting, userRole, onNavigate }) {
  const [hiring, setHiring] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [workforce, setWorkforce] = useState(null);
  const [retention, setRetention] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    async function loadAll() {
      const [h, w, r, p, f, c] = await Promise.all([
        hiringService.getMetrics(), workforceService.getMetrics(),
        retentionService.getMetrics(), performanceService.getMetrics(),
        financialService.getMetrics(), complianceService.getMetrics(),
      ]);
      setHiring(h); setWorkforce(w); setRetention(r);
      setPerformance(p); setFinancial(f); setCompliance(c);
      setLoadingMetrics(false);
    }
    loadAll();
  }, []);

  useEffect(() => {
    async function loadBriefing() {
      try { setBriefing(await getChiefOfStaffBriefing(userRole || "executive")); }
      catch (e) { setBriefing("Couldn't generate briefing: " + e.message); }
      setBriefingLoading(false);
    }
    loadBriefing();
  }, [userRole]);

  async function handleAsk() {
    if (!question.trim()) return;
    setAsking(true); setAnswer("");
    try { setAnswer(await askIntelligenceEngine(question)); }
    catch (e) { setAnswer("Error: " + e.message); }
    setAsking(false);
  }

  const role = userRole || "default";
  const resolvedGreeting = GREETINGS[role] || greeting || "Good day. Here's what's happening.";
  const placeholder = PLACEHOLDERS[role] || PLACEHOLDERS.default;
  const showFinancial = !["chro", "hr"].includes(role);
  const isRecruiter = role === "recruiter";
  const otherLabel = role === "manager" ? "Your Team Intelligence" : "Other Intelligence Modules";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.cyan, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>✦ Workforce Intelligence Command Center</div>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: C.textDark, letterSpacing: "-0.02em" }}>{resolvedGreeting}</h1>
        <p style={{ margin: "6px 0 0", color: C.textMuted, fontSize: 14, lineHeight: 1.5 }}>Live data from every connected module, orchestrated by your AI Chief of Staff.</p>
      </div>

      <Card style={{ borderTop: `3px solid ${C.cyan}` }}>
        <Label color={C.cyan}>Ask Your Chief of Staff</Label>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 8 }}>
          <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && question.trim()) handleAsk(); }} placeholder={placeholder} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.textDark, fontSize: 14, outline: "none", fontFamily: "inherit", minHeight: 44 }} />
          <button onClick={handleAsk} disabled={asking || !question.trim()} style={{ background: C.cyan, color: "#fff", border: "none", borderRadius: 8, padding: "11px 20px", fontSize: 13, fontWeight: 700, cursor: asking ? "default" : "pointer", opacity: asking ? 0.6 : 1, fontFamily: "inherit", minHeight: 44, width: isMobile ? "100%" : "auto" }}>{asking ? "…" : "Ask"}</button>
        </div>
        {(asking || answer) && (
          <div style={{ background: `${C.cyan}08`, border: `1px solid ${C.cyan}25`, borderLeft: `3px solid ${C.cyan}`, borderRadius: 8, padding: 18, marginTop: 14, fontSize: 14, lineHeight: 1.8, color: C.textDark, whiteSpace: "pre-wrap" }}>
            {asking ? <span style={{ color: C.cyan, fontSize: 13, fontWeight: 600 }}>◈ Querying every module…</span> : renderMarkdown(answer)}
          </div>
        )}
      </Card>

      <HRAlerts onNavigate={onNavigate} />

      <Card style={{ borderTop: `3px solid ${C.navy}` }}>
        <Label color={C.navy}>Today's Briefing — AI Chief of Staff</Label>
        {briefingLoading
          ? <span style={{ color: C.cyan, fontSize: 13, fontWeight: 600 }}>◈ Preparing your briefing…</span>
          : <div style={{ fontSize: 14, lineHeight: 1.8, color: C.textMid, whiteSpace: "pre-wrap" }}>{renderMarkdown(briefing)}</div>}
      </Card>

      <Label color={C.violet}>Hiring Intelligence</Label>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: 10 }}>
        <Widget label="Open Reqs" value={hiring?.openReqs ?? "—"} accent={C.violet} onClick={() => onNavigate?.("recruit")} subtitle="View pipeline →" />
        <Widget label="In Screening" value={hiring?.inScreening ?? "—"} accent={C.violet} onClick={() => onNavigate?.("recruit")} />
        <Widget label="Interviewing" value={hiring?.interviewing ?? "—"} accent={C.violet} onClick={() => onNavigate?.("recruit")} />
        <Widget label="Offers Out" value={hiring?.offersOut ?? "—"} accent={C.emerald} onClick={() => onNavigate?.("recruit")} />
        <Widget label="Avg Days Open" value={hiring?.avgDaysOpen ?? "—"} accent={C.amber} onClick={() => onNavigate?.("recruit")} />
        <Widget label="Hires MTD" value={hiring?.hiresMTD ?? "—"} accent={C.emerald} onClick={() => onNavigate?.("onboard")} subtitle="View onboarding →" />
      </div>

      {!isRecruiter && (
        <>
          <Label color={C.blue}>Workforce Intelligence</Label>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: 10 }}>
            <Widget label="Headcount" value={workforce?.headcount ?? "—"} accent={C.blue} onClick={() => onNavigate?.("employee")} subtitle="View directory →" />
            <Widget label="Avg Tenure" value={workforce?.avgTenure ?? "—"} accent={C.blue} onClick={() => onNavigate?.("employee")} />
            <Widget label="Departments" value={workforce?.departments ?? "—"} accent={C.blue} onClick={() => onNavigate?.("employee")} />
            <Widget label="New (30d)" value={workforce?.newLast30 ?? "—"} accent={C.teal} onClick={() => onNavigate?.("onboard")} subtitle="View onboarding →" />
            <Widget label="Remote %" value={workforce?.remotePercent ?? "—"} accent={C.blue} />
            <Widget label="Engagement" value={workforce?.engagement ?? "—"} accent={C.emerald} />
          </div>
        </>
      )}

      {isRecruiter && (
        <>
          <Label color={C.blue}>Workforce Snapshot</Label>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 10 }}>
            <Widget label="Headcount" value={workforce?.headcount ?? "—"} accent={C.blue} onClick={() => onNavigate?.("employee")} />
            <Widget label="New (30d)" value={workforce?.newLast30 ?? "—"} accent={C.teal} onClick={() => onNavigate?.("onboard")} />
            <Widget label="Engagement" value={workforce?.engagement ?? "—"} accent={C.emerald} />
          </div>
        </>
      )}

      <Label color={C.textMuted}>{otherLabel}</Label>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
        <Card style={{ borderLeft: `3px solid ${C.rose}` }}>
          <Label color={C.rose}>Retention Intelligence</Label>
          <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7 }}>
            {retention?.highRiskCount > 0 ? (
              <>
                <span style={{ fontWeight: 700, color: C.rose }}>{retention.highRiskCount} high flight-risk</span> • {" "}
                {retention.highRiskEmployees.map((e, i) => (
                  <span key={i}>
                    {i > 0 && ", "}
                    <ClickableName name={e.name} onClick={() => setActiveModal({
                      employee: e.name, label: "Retention — Stay Interview", accent: C.rose, type: "stay_interview",
                      details: `${e.role} · Flight risk score: ${e.risk_score}`,
                      defaultMessage: `Hi ${e.name.split(" ")[0]},\n\nI'd love to connect for a quick stay interview this week — just 20 minutes to hear how things are going and what we can do to make QumulusAI even better for you.\n\nDoes Thursday or Friday work?\n\nBest,\nMike`,
                    })} />
                  </span>
                ))}
              </>
            ) : "No high flight-risk employees."}
          </div>
        </Card>

        <Card style={{ borderLeft: `3px solid ${C.amber}` }}>
          <Label color={C.amber}>Performance Intelligence</Label>
          <div style={{ fontSize: 14, color: C.textMid }}>{performance?.totalGoals > 0 ? `${performance.completedGoals}/${performance.totalGoals} goals completed` : "No data yet."}</div>
        </Card>

        {showFinancial && (
          <Card style={{ borderLeft: `3px solid ${C.teal}`, cursor: "pointer" }} onClick={() => onNavigate?.("payroll")}>
            <Label color={C.teal}>Financial Intelligence</Label>
            <div style={{ fontSize: 14, color: C.textMid }}>
              {financial?.latestLaborCost ? (<>Total Labor: <strong>${financial.latestLaborCost.toLocaleString()}</strong> <span style={{ fontSize: 11, color: C.textMuted }}>→ view payroll</span></>) : "No data yet."}
            </div>
          </Card>
        )}

        <Card style={{ borderLeft: `3px solid ${C.emerald}` }}>
          <Label color={C.emerald}>Compliance Intelligence</Label>
          <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7 }}>
            {compliance?.missingDocuments > 0 ? (
              <>
                <span style={{ fontWeight: 700, color: C.rose }}>{compliance.missingDocuments} missing docs</span> • {" "}
                {[...new Map(compliance.missingDocDetails.map(d => [d.name, d])).values()].map((d, i) => {
                  const docs = compliance.missingDocDetails.filter(x => x.name === d.name).map(x => x.document);
                  return (
                    <span key={i}>
                      {i > 0 && ", "}
                      <ClickableName name={d.name} onClick={() => setActiveModal({
                        employee: d.name, label: "Compliance — Missing Documents", accent: C.emerald, type: "compliance_reminder",
                        details: `Missing: ${docs.join(", ")}`,
                        defaultMessage: `Hi ${d.name.split(" ")[0]},\n\nJust a quick reminder that we're still missing the following document(s) from your file:\n\n${docs.map(doc => `• ${doc}`).join("\n")}\n\nPlease complete these at your earliest convenience — they're required for compliance.\n\nThank you,\nQumulusAI People & Culture`,
                      })} />
                    </span>
                  );
                })}
              </>
            ) : "No outstanding items."}
          </div>
        </Card>
      </div>

      <Card style={{ background: `${C.navy}08`, border: `1px solid ${C.navy}20` }}>
        <Label color={C.navy}>Quick Navigation</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            { label: "Recruiting", id: "recruit", accent: C.violet },
            { label: "Onboarding", id: "onboard", accent: C.teal },
            { label: "Employee Hub", id: "employee", accent: C.blue },
            { label: "Payroll", id: "payroll", accent: C.teal },
            { label: "Talent Inbox", id: "inbox", accent: C.rose },
            { label: "Messenger", id: "messenger", accent: C.cyan },
            { label: "Security", id: "security", accent: C.blue },
            { label: "Careers", id: "careers", accent: C.emerald },
          ].map(n => (
            <button key={n.id} onClick={() => onNavigate?.(n.id)} style={{ background: `${n.accent}10`, border: `1px solid ${n.accent}30`, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, color: n.accent, cursor: "pointer", fontFamily: "inherit" }}>{n.label} →</button>
          ))}
        </div>
      </Card>

      {activeModal && <ActionModal modal={activeModal} onClose={() => setActiveModal(null)} />}
    </div>
  );
}
