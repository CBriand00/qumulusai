import { useState, useEffect } from "react";
import { ensureModulesRegistered, hiringService, workforceService, retentionService, performanceService, financialService, complianceService } from "./services/registerModules";
import { askIntelligenceEngine, getChiefOfStaffBriefing } from "./services/intelligenceEngine";

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
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: C.textDark, letterSpacing: "-0.02em" }}>{value}</div>
    </Card>
  );
}

export default function CommandCenter({ greeting }) {
  const [hiring, setHiring] = useState(null);
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
      try { setBriefing(await getChiefOfStaffBriefing()); }
      catch (e) { setBriefing("Couldn't generate briefing: " + e.message); }
      setBriefingLoading(false);
    }
    loadBriefing();
  }, []);

  async function handleAsk() {
    if (!question.trim()) return;
    setAsking(true); setAnswer("");
    try { setAnswer(await askIntelligenceEngine(question)); }
    catch (e) { setAnswer("Error: " + e.message); }
    setAsking(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `${C.cyan}15`, border: `1px solid ${C.cyan}40`, borderRadius: 100, padding: "5px 18px", marginBottom: 16, fontSize: 10, fontWeight: 800, color: C.cyan, letterSpacing: "0.14em", textTransform: "uppercase" }}>✦ AI Command Center</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.textDark, margin: "0 0 6px", letterSpacing: "-0.02em" }}>{greeting || "Good day. Here's what's happening."}</h1>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>Live data from every connected module, orchestrated by your AI Chief of Staff.</p>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Label color={C.cyan}>Ask Your Chief of Staff</Label>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && question.trim()) handleAsk(); }}
            placeholder="e.g. Who's at risk of leaving? Summarize our hiring pipeline. What should I focus on today?"
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.textDark, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
          <button onClick={handleAsk} disabled={asking || !question.trim()}
            style={{ background: C.cyan, color: C.navy, border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 13, fontWeight: 800, cursor: asking ? "default" : "pointer", opacity: asking ? 0.6 : 1, fontFamily: "inherit" }}>
            {asking ? "…" : "Ask"}
          </button>
        </div>
        {(asking || answer) && (
          <div style={{ background: `${C.cyan}08`, border: `1px solid ${C.cyan}25`, borderLeft: `3px solid ${C.cyan}`, borderRadius: 8, padding: 18, marginTop: 14, fontSize: 14, lineHeight: 1.8, color: C.textDark }}>
            {asking ? <span style={{ color: C.cyan, fontWeight: 600 }}>◈ Querying every module…</span> : renderMarkdown(answer)}
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: 16, borderLeft: `3px solid ${C.violet}` }}>
        <Label color={C.violet}>Today's Briefing — AI Chief of Staff</Label>
        {briefingLoading
          ? <div style={{ fontSize: 13, color: C.violet, fontWeight: 600 }}>◈ Preparing your briefing…</div>
          : <div style={{ fontSize: 14, lineHeight: 1.75, color: C.textDark }}>{renderMarkdown(briefing)}</div>}
      </Card>

      <Label color={C.violet}>Hiring Intelligence</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
        <Widget label="Applications" value={loadingMetrics ? "—" : hiring?.totalApplications} />
        <Widget label="Open Reqs" value={loadingMetrics ? "—" : hiring?.openRequisitions} />
        <Widget label="Offers Extended" value={loadingMetrics ? "—" : hiring?.totalOffers} />
        <Widget label="Offer Accept Rate" value={loadingMetrics ? "—" : (hiring?.offerAcceptRate !== null ? `${hiring?.offerAcceptRate}%` : "—")} />
        <Widget label="Upcoming Interviews" value={loadingMetrics ? "—" : hiring?.upcomingInterviews} />
      </div>

      <Label color={C.amber}>Workforce Intelligence</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
        <Widget label="Total Headcount" value={loadingMetrics ? "—" : workforce?.totalHeadcount} />
        <Widget label="New Hires (30d)" value={loadingMetrics ? "—" : workforce?.newHiresLast30Days} />
        <Widget label="Departments" value={loadingMetrics ? "—" : Object.keys(workforce?.headcountByDepartment || {}).length} />
      </div>

      <Label color={C.textMuted}>Other Intelligence Modules</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {[
          { title: "Retention Intelligence", accent: C.rose, text: retention?.highRiskCount > 0 ? `${retention.highRiskCount} high flight-risk` : "No data yet." },
          { title: "Performance Intelligence", accent: C.blue, text: performance?.totalGoals > 0 ? `${performance.completedGoals}/${performance.totalGoals} goals completed` : "No data yet." },
          { title: "Financial Intelligence", accent: C.teal, text: financial?.latestLaborCost ? `$${financial.latestLaborCost.toLocaleString()}` : "No data yet." },
          { title: "Compliance Intelligence", accent: C.emerald, text: compliance?.missingDocuments > 0 ? `${compliance.missingDocuments} missing docs` : "No outstanding items." },
        ].map(m => (
          <Card key={m.title}>
            <Label color={m.accent}>{m.title}</Label>
            <div style={{ fontSize: 13, color: C.textMid }}>{m.text}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
