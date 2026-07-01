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
    if (trimmed.startsWith("## ")) return <h2 key={idx} style={{ fontSize: 17, fontWeight: 700, color: "#0D1117", margin: "16px 0 6px" }}>{trimmed.slice(3)}</h2>;
    if (trimmed.startsWith("### ")) return <h3 key={idx} style={{ fontSize: 15, fontWeight: 700, color: "#0D1117", margin: "12px 0 4px" }}>{trimmed.slice(4)}</h3>;
    if (trimmed === "---") return <hr key={idx} style={{ border: "none", borderTop: "1px solid #DDE3ED", margin: "12px 0" }} />;
    if (trimmed === "") return <div key={idx} style={{ height: 6 }} />;
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
    const formatted = parts.map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : p
    );
    return <p key={idx} style={{ margin: "2px 0", fontSize: 14, lineHeight: 1.75, color: "#0D1117" }}>{formatted}</p>;
  });
}

function Card({ children, style }) {
  return <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22, ...style }}>{children}</div>;
}

function Label({ children, color }) {
  return <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: color || C.textMuted, marginBottom: 14 }}>{children}</div>;
}

function Widget({ label, value, accent }) {
  const a = accent || C.cyan;
  return (
    <Card style={{ padding: 16, borderTop: `3px solid ${a}` }}>
      <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: C.textDark, letterSpacing: "-0.02em" }}>{value}</div>
    </Card>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 32, maxWidth: 480, width: "calc(100% - 48px)", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94A3B8", lineHeight: 1 }}>×</button>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: modal.accent, marginBottom: 8 }}>{modal.label}</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0D1117", margin: "0 0 6px" }}>{modal.employee}</h2>
        {modal.details && <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px", lineHeight: 1.5 }}>{modal.details}</p>}
        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value)}
          rows={6}
          style={{ width: "100%", boxSizing: "border-box", background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px 14px", color: "#0F172A", fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical", fontFamily: "inherit" }}
        />
        <button
          onClick={handleSend}
          disabled={sending || sent || !msg.trim()}
          style={{ width: "100%", marginTop: 12, background: sent ? "#16A34A" : "#0A2540", border: "none", borderRadius: 8, padding: "13px 0", color: "#fff", fontSize: 14, fontWeight: 700, cursor: (sending || sent) ? "default" : "pointer", opacity: sending ? 0.7 : 1, fontFamily: "inherit" }}>
          {sent ? "✓ Sent!" : sending ? "Sending…" : "Send Message"}
        </button>
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
      style={{ cursor: "pointer", textDecoration: hover ? "underline" : "none", color: hover ? "#2563EB" : "inherit", fontWeight: 600 }}>
      {name}
    </span>
  );
}

const GREETINGS = {
  ceo:       "Good day. Here's your workforce at a glance.",
  executive: "Good day. Here's your workforce at a glance.",
  chro:      "Good day. Here's your people intelligence briefing.",
  hr:        "Good day. Here's your people intelligence briefing.",
  recruiter: "Good day. Here's your recruiting pipeline.",
  manager:   "Good day. Here's your team briefing.",
};

const PLACEHOLDERS = {
  ceo:       "Ask about workforce costs, headcount, flight risk, hiring strategy…",
  executive: "Ask about workforce costs, headcount, flight risk, hiring strategy…",
  chro:      "Ask about retention, compliance, engagement, recruiting…",
  hr:        "Ask about retention, compliance, engagement, recruiting…",
  recruiter: "Ask about pipeline, candidates, interviews, offers…",
  manager:   "Ask about my team, goals, performance, 1:1 prep…",
  default:   "Ask anything about your workforce…",
};

function HRAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("hr_alerts")
        .select("*")
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(10);
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
    <Card style={{ marginBottom: 16, borderLeft: `3px solid ${C.rose}` }}>
      <Label color={C.rose}>HR Alerts ({alerts.length})</Label>
      {alerts.map(a => (
        <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{typeIcon[a.type] || typeIcon.default}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>{a.title}</div>
            {a.body && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 1.5 }}>{a.body}</div>}
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{new Date(a.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
          </div>
          <button
            onClick={() => markRead(a.id)}
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, color: C.textMuted, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
            ✓ Done
          </button>
        </div>
      ))}
    </Card>
  );
}

export default function CommandCenter({ greeting, userRole }) {
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
    <div style={{ overflowX: "hidden", width: "100%", boxSizing: "border-box" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `${C.cyan}15`, border: `1px solid ${C.cyan}40`, borderRadius: 100, padding: "5px 18px", marginBottom: 16, fontSize: 10, fontWeight: 800, color: C.cyan, letterSpacing: "0.14em", textTransform: "uppercase", maxWidth: "100%", boxSizing: "border-box" }}>✦ AI Command Center</div>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.textDark, margin: "0 0 6px", letterSpacing: "-0.02em" }}>{resolvedGreeting}</h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>Live data from every connected module, orchestrated by your AI Chief of Staff.</p>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Label color={C.cyan}>Ask Your Chief of Staff</Label>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 8 }}>
          <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && question.trim()) handleAsk(); }}
            placeholder={placeholder}
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.textDark, fontSize: 14, outline: "none", fontFamily: "inherit", minHeight: 44 }} />
          <button onClick={handleAsk} disabled={asking || !question.trim()}
            style={{ background: C.cyan, color: C.navy, border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 13, fontWeight: 800, cursor: asking ? "default" : "pointer", opacity: asking ? 0.6 : 1, fontFamily: "inherit", minHeight: 44, width: isMobile ? "100%" : "auto" }}>
            {asking ? "…" : "Ask"}
          </button>
        </div>
        {(asking || answer) && (
          <div style={{ background: `${C.cyan}08`, border: `1px solid ${C.cyan}25`, borderLeft: `3px solid ${C.cyan}`, borderRadius: 8, padding: 18, marginTop: 14, fontSize: 14, lineHeight: 1.8, color: C.textDark }}>
            {asking ? <span style={{ color: C.cyan, fontWeight: 600 }}>◈ Querying every module…</span> : renderMarkdown(answer)}
          </div>
        )}
      </Card>

      <HRAlerts />

      <Card style={{ marginBottom: 16, borderLeft: `3px solid ${C.violet}` }}>
        <Label color={C.violet}>Today's Briefing — AI Chief of Staff</Label>
        {briefingLoading
          ? <div style={{ fontSize: 13, color: C.violet, fontWeight: 600 }}>◈ Preparing your briefing…</div>
          : <div style={{ fontSize: 14, lineHeight: 1.75, color: C.textDark }}>{renderMarkdown(briefing)}</div>}
      </Card>

      <Label color={C.violet}>Hiring Intelligence</Label>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
        <Widget label="Applications" value={loadingMetrics ? "—" : hiring?.totalApplications} accent={C.violet} />
        <Widget label="Open Reqs" value={loadingMetrics ? "—" : hiring?.openRequisitions} accent={C.violet} />
        <Widget label="Offers Extended" value={loadingMetrics ? "—" : hiring?.totalOffers} accent={C.violet} />
        <Widget label="Offer Accept Rate" value={loadingMetrics ? "—" : (hiring?.offerAcceptRate !== null ? `${hiring?.offerAcceptRate}%` : "—")} accent={C.violet} />
        <Widget label="Upcoming Interviews" value={loadingMetrics ? "—" : hiring?.upcomingInterviews} accent={C.violet} />
      </div>

      {!isRecruiter && (
        <>
          <Label color={C.amber}>Workforce Intelligence</Label>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
            <Widget label="Total Headcount" value={loadingMetrics ? "—" : workforce?.totalHeadcount} accent={C.amber} />
            <Widget label="New Hires (30d)" value={loadingMetrics ? "—" : workforce?.newHiresLast30Days} accent={C.amber} />
            <Widget label="Departments" value={loadingMetrics ? "—" : Object.keys(workforce?.headcountByDepartment || {}).length} accent={C.amber} />
            <Widget label="Onboarding" value={loadingMetrics ? "—" : (workforce?.onboardingCount ?? "—")} accent={C.teal} />
            <Widget label="Avg Engagement" value={loadingMetrics ? "—" : (retention?.avgEngagementScore != null ? `${retention.avgEngagementScore}` : "—")} accent={C.emerald} />
          </div>
        </>
      )}

      {isRecruiter && (
        <>
          <Label color={C.amber}>Workforce Snapshot</Label>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
            <Widget label="Total Headcount" value={loadingMetrics ? "—" : workforce?.totalHeadcount} accent={C.amber} />
            <Widget label="Onboarding" value={loadingMetrics ? "—" : (workforce?.onboardingCount ?? "—")} accent={C.teal} />
          </div>
        </>
      )}

      <Label color={C.textMuted}>{otherLabel}</Label>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <Card>
          <Label color={C.rose}>Retention Intelligence</Label>
          <div style={{ fontSize: 13, color: C.textMid }}>
            {retention?.highRiskCount > 0 ? (
              <>
                {retention.highRiskCount} high flight-risk •{" "}
                {retention.highRiskEmployees.map((e, i) => (
                  <span key={e.name}>
                    {i > 0 && ", "}
                    <ClickableName name={e.name} onClick={() => setActiveModal({
                      employee: e.name,
                      label: "Retention — Stay Interview",
                      accent: C.rose,
                      type: "stay_interview",
                      details: `${e.role} · Flight risk score: ${e.risk_score}`,
                      defaultMessage: `Hi ${e.name.split(" ")[0]},\n\nI'd love to connect for a quick stay interview this week — just 20 minutes to hear how things are going and what we can do to make QumulusAI even better for you.\n\nDoes Thursday or Friday work?\n\nBest,\nMike`,
                    })} />
                  </span>
                ))}
              </>
            ) : "No high flight-risk employees."}
          </div>
        </Card>

        <Card>
          <Label color={C.blue}>Performance Intelligence</Label>
          <div style={{ fontSize: 13, color: C.textMid }}>
            {performance?.totalGoals > 0 ? `${performance.completedGoals}/${performance.totalGoals} goals completed` : "No data yet."}
          </div>
        </Card>

        {showFinancial && (
          <Card>
            <Label color={C.teal}>Financial Intelligence</Label>
            <div style={{ fontSize: 13, color: C.textMid }}>
              {financial?.latestLaborCost ? `$${financial.latestLaborCost.toLocaleString()}` : "No data yet."}
            </div>
          </Card>
        )}

        <Card>
          <Label color={C.emerald}>Compliance Intelligence</Label>
          <div style={{ fontSize: 13, color: C.textMid }}>
            {compliance?.missingDocuments > 0 ? (
              <>
                {compliance.missingDocuments} missing docs •{" "}
                {[...new Map(compliance.missingDocDetails.map(d => [d.name, d])).values()].map((d, i, arr) => {
                  const docs = compliance.missingDocDetails.filter(x => x.name === d.name).map(x => x.document);
                  return (
                    <span key={d.name}>
                      {i > 0 && ", "}
                      <ClickableName name={d.name} onClick={() => setActiveModal({
                        employee: d.name,
                        label: "Compliance — Missing Documents",
                        accent: C.emerald,
                        type: "compliance_reminder",
                        details: `Missing: ${docs.join(", ")}`,
                        defaultMessage: `Hi ${d.name.split(" ")[0]},\n\nJust a quick reminder that we're still missing the following document(s) from your file:\n\n${docs.map(doc => `• ${doc}`).join("\n")}\n\nPlease complete these at your earliest convenience — they're required for compliance. Reply here or reach out to People & Culture if you have any questions.\n\nThank you,\nQumulusAI People & Culture`,
                      })} />
                    </span>
                  );
                })}
              </>
            ) : "No outstanding items."}
          </div>
        </Card>
      </div>

      {activeModal && <ActionModal modal={activeModal} onClose={() => setActiveModal(null)} />}
    </div>
  );
}
