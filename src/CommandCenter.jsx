import { useState, useEffect } from "react";
import { useBreakpoint } from "./useBreakpoint";
import { ensureModulesRegistered, hiringService, workforceService, retentionService, performanceService, financialService, complianceService } from "./services/registerModules";
import { askIntelligenceEngine, getChiefOfStaffBriefing } from "./services/intelligenceEngine";
import { supabase } from "./supabase";

ensureModulesRegistered();

const C = {
  bg: "#F0F2F7", bgCard: "#FFFFFF", textDark: "#0D1117", textMid: "#3D4B5C",
  textMuted: "#7E8FA3", border: "#E2E8F0", cyan: "#00C2E0", navy: "#0A2540",
  blue: "#2563EB", violet: "#7C3AED", teal: "#0D9488", amber: "#D97706",
  rose: "#DC2626", emerald: "#059669", blueLight: "#3B82F6",
};

function KPICard({ icon, label, value, subtitle, accent, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        background: "#fff",
        border: "1px solid " + (hover && onClick ? (accent || C.blue) : C.border),
        borderRadius: 12,
        padding: "20px 18px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s ease",
        transform: hover && onClick ? "translateY(-1px)" : "none",
        boxShadow: hover && onClick ? "0 4px 12px rgba(0,0,0,0.06)" : "none",
        flex: 1,
        minWidth: 140,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: (accent || C.blue) + "12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: accent || C.blue }}>{icon}</div>
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{label}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.textDark, letterSpacing: "-0.02em" }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: C.emerald, marginTop: 6, fontWeight: 500 }}>{subtitle}</div>}
    </div>
  );
}

function SectionCard({ title, action, children, style, onClick }) {
  return (
    <div onClick={onClick} style={{ background: "#fff", border: "1px solid " + C.border, borderRadius: 12, padding: "20px 22px", ...style }}>
      {(title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          {title && <div style={{ fontSize: 15, fontWeight: 700, color: C.textDark }}>{title}</div>}
          {action && <div style={{ fontSize: 12, color: C.blue, fontWeight: 600, cursor: "pointer" }}>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function FunnelBar({ label, value, max, color }) {
  var pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <div style={{ width: 90, fontSize: 12, color: C.textMuted, textAlign: "right", flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 24, background: "#F1F5F9", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: color || C.blue, borderRadius: 6, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ width: 40, fontSize: 13, fontWeight: 700, color: C.textDark, textAlign: "right" }}>{value}</div>
    </div>
  );
}

function DonutChart({ data, total, label }) {
  var cumulative = 0;
  var colors = [C.blue, C.violet, C.emerald, C.amber, C.teal, C.rose];
  var segments = data.map(function(d, i) {
    var pct = total > 0 ? (d.value / total) * 100 : 0;
    var start = cumulative;
    cumulative += pct;
    return { name: d.name, value: d.value, pct: pct, start: start, color: colors[i % colors.length] };
  });

  var gradientParts = segments.map(function(s) { return s.color + " " + s.start + "% " + (s.start + s.pct) + "%"; }).join(", ");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ width: 120, height: 120, borderRadius: "50%", background: "conic-gradient(" + gradientParts + ")", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.textDark }}>{total}</div>
          <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map(function(s, i) {
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ color: C.textMid }}>{s.name}</span>
              <span style={{ color: C.textDark, fontWeight: 700, marginLeft: "auto" }}>{s.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityItem({ text, time }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid " + C.border }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.blue + "10", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, color: C.blue, fontWeight: 700 }}>A</div>
      <div style={{ flex: 1, fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>{text}</div>
      <div style={{ fontSize: 11, color: C.textMuted, flexShrink: 0, whiteSpace: "nowrap" }}>{time}</div>
    </div>
  );
}

function InsightItem({ text }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid " + C.border }}>
      <span style={{ color: C.amber, fontSize: 14, flexShrink: 0, fontWeight: 700 }}>!</span>
      <span style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function MiniStat({ label, value, trend }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.textDark }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{label}</div>
      {trend && <div style={{ fontSize: 11, color: trend.indexOf("+") >= 0 || trend.indexOf("new") >= 0 || trend.indexOf("stable") >= 0 ? C.emerald : C.rose, marginTop: 2, fontWeight: 600 }}>{trend}</div>}
    </div>
  );
}

export default function CommandCenter({ greeting, userRole, onNavigate }) {
  const [hiring, setHiring] = useState(null);
  const [workforce, setWorkforce] = useState(null);
  const [retention, setRetention] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [recentHiring, setRecentHiring] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const { isMobile } = useBreakpoint();

  useEffect(function() {
    async function loadAll() {
      var results = await Promise.all([
        hiringService.getMetrics(), workforceService.getMetrics(),
        retentionService.getMetrics(), performanceService.getMetrics(),
        financialService.getMetrics(), complianceService.getMetrics(),
      ]);
      setHiring(results[0]); setWorkforce(results[1]); setRetention(results[2]);
      setPerformance(results[3]); setFinancial(results[4]); setCompliance(results[5]);
      setLoadingMetrics(false);
      try {
        var activity = await hiringService.getRecentActivity(72);
        setRecentHiring(activity);
      } catch(e) {}
    }
    loadAll();
  }, []);

  useEffect(function() {
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

  var now = new Date();
  var timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  var funnel = hiring ? (hiring.pipelineByStage || {}) : {};
  var funnelMax = Math.max(hiring ? hiring.totalApplications || 1 : 1, 1);

  var deptData = [];
  if (workforce && workforce.headcountByDepartment) {
    deptData = Object.entries(workforce.headcountByDepartment).map(function(entry) { return { name: entry[0], value: entry[1] }; }).sort(function(a, b) { return b.value - a.value; }).slice(0, 6);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.textDark }}>Command Center</h1>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 14 }}>Welcome back, Chateau. Here's what's happening across your workforce.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>Last updated: {timeStr}</span>
          <button onClick={function() { if (onNavigate) onNavigate("recruit"); }} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ New Requisition</button>
        </div>
      </div>

      {/* KPI ROW */}
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
        <KPICard icon="HC" label="Headcount" value={workforce ? workforce.totalHeadcount : "--"} subtitle={workforce && workforce.newHiresLast30Days ? "+ " + workforce.newHiresLast30Days + " new this month" : null} accent={C.blue} onClick={function() { if (onNavigate) onNavigate("employee"); }} />
        <KPICard icon="RQ" label="Open Requisitions" value={hiring ? hiring.openRequisitions : "--"} subtitle={hiring ? hiring.totalApplications + " total applications" : null} accent={C.violet} onClick={function() { if (onNavigate) onNavigate("recruit"); }} />
        <KPICard icon="TF" label="Time to Fill" value={hiring && hiring.avgDaysOpen ? hiring.avgDaysOpen + "d" : "--"} accent={C.teal} onClick={function() { if (onNavigate) onNavigate("recruit"); }} />
        <KPICard icon="$" label="Labor Cost" value={financial && financial.latestLaborCost ? "$" + Math.round(financial.latestLaborCost / 1000) + "k" : "--"} accent={C.amber} onClick={function() { if (onNavigate) onNavigate("payroll"); }} />
        <KPICard icon="AR" label="Attrition Risk" value={retention && retention.highRiskCount ? retention.highRiskCount + " high" : "Low"} accent={C.rose} />
        <KPICard icon="EN" label="Engagement" value={retention && retention.avgEngagementScore ? retention.avgEngagementScore + "/100" : "--"} accent={C.emerald} />
      </div>

      {/* CHARTS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
        <SectionCard title="Hiring Funnel">
          <FunnelBar label="Applied" value={hiring ? hiring.totalApplications || 0 : 0} max={funnelMax} color={C.blue} />
          <FunnelBar label="Screened" value={funnel.screened || funnel.screening || 0} max={funnelMax} color="#4F8CF7" />
          <FunnelBar label="Interviewing" value={funnel.interviewing || funnel.interview || 0} max={funnelMax} color={C.violet} />
          <FunnelBar label="Offered" value={funnel.offer || hiring && hiring.totalOffers || 0} max={funnelMax} color={C.emerald} />
          <FunnelBar label="Hired" value={funnel.hired || 0} max={funnelMax} color={C.teal} />
        </SectionCard>

        <SectionCard title="Requisitions by Department">
          {deptData.length > 0 ? (
            <DonutChart data={deptData} total={workforce ? workforce.totalHeadcount : 0} label="Total" />
          ) : (
            <div style={{ color: C.textMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Loading...</div>
          )}
        </SectionCard>

        <SectionCard title="Live Activity" action="View all">
          {recentHiring && recentHiring.newApplications && recentHiring.newApplications.slice(0, 5).map(function(app, i) {
            return <ActivityItem key={i} text={<span><strong>{app.full_name}</strong> applied for {app.role_title}</span>} time={new Date(app.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} />;
          })}
          {recentHiring && recentHiring.newOffers && recentHiring.newOffers.slice(0, 2).map(function(offer, i) {
            return <ActivityItem key={"o" + i} text={<span><strong>{offer.candidate_name}</strong> received offer for {offer.role}</span>} time={new Date(offer.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} />;
          })}
          {(!recentHiring || (!recentHiring.newApplications || recentHiring.newApplications.length === 0) && (!recentHiring.newOffers || recentHiring.newOffers.length === 0)) && (
            <div style={{ color: C.textMuted, fontSize: 12, padding: "16px 0", textAlign: "center" }}>No recent activity</div>
          )}
        </SectionCard>
      </div>

      {/* BOTTOM ROW */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
        <SectionCard title="Top Requisitions" action="View all" onClick={function() { if (onNavigate) onNavigate("recruit"); }} style={{ cursor: "pointer" }}>
          {hiring && hiring.pipelineByStage ? Object.entries(hiring.pipelineByStage).slice(0, 4).map(function(entry, i) {
            var stageLabels = { new: "New", reviewing: "Reviewing", interview: "Interviewing", offer: "Offer Extended", hired: "Hired", rejected: "Rejected" };
            var stageLabel = stageLabels[entry[0]] || (entry[0].charAt(0).toUpperCase() + entry[0].slice(1));
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid " + C.border }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textDark }}>{stageLabel}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>Pipeline stage</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.textDark }}>{entry[1]}</div>
              </div>
            );
          }) : <div style={{ color: C.textMuted, fontSize: 12 }}>Loading...</div>}
        </SectionCard>

        <SectionCard title="AI Insights">
          {briefingLoading ? (
            <div style={{ color: C.cyan, fontSize: 12, fontWeight: 600 }}>Generating insights...</div>
          ) : (
            <div>
              {retention && retention.highRiskCount > 0 && <InsightItem text={"Retention risk detected for " + retention.highRiskCount + " employee" + (retention.highRiskCount > 1 ? "s" : "") + " in the next 60 days."} />}
              {compliance && compliance.missingDocuments > 0 && <InsightItem text={compliance.missingDocuments + " missing compliance documents need attention."} />}
              {hiring && hiring.offerAcceptRate && <InsightItem text={"Offer acceptance rate is " + hiring.offerAcceptRate + "%. " + (hiring.offerAcceptRate >= 80 ? "Strong performance." : "Below benchmark, review comp packages.")} />}
              {performance && performance.totalGoals > 0 && <InsightItem text={performance.completedGoals + "/" + performance.totalGoals + " goals completed across the organization."} />}
              {(!retention || !retention.highRiskCount) && (!compliance || !compliance.missingDocuments) && <InsightItem text="All systems nominal. No critical risks detected." />}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Workforce Cost Overview" style={{ cursor: "pointer" }} onClick={function() { if (onNavigate) onNavigate("payroll"); }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Cost</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.textDark, marginTop: 4 }}>{financial && financial.latestLaborCost ? "$" + financial.latestLaborCost.toLocaleString() : "--"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.textMuted }}>Payroll</span>
              <span style={{ color: C.textDark, fontWeight: 600 }}>{financial && financial.latestLaborCost ? "$" + Math.round(financial.latestLaborCost * 0.74).toLocaleString() + " (74%)" : "--"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.textMuted }}>Benefits</span>
              <span style={{ color: C.textDark, fontWeight: 600 }}>{financial && financial.latestLaborCost ? "$" + Math.round(financial.latestLaborCost * 0.16).toLocaleString() + " (16%)" : "--"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.textMuted }}>Contractors</span>
              <span style={{ color: C.textDark, fontWeight: 600 }}>{financial && financial.latestLaborCost ? "$" + Math.round(financial.latestLaborCost * 0.07).toLocaleString() + " (7%)" : "--"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.textMuted }}>Other</span>
              <span style={{ color: C.textDark, fontWeight: 600 }}>{financial && financial.latestLaborCost ? "$" + Math.round(financial.latestLaborCost * 0.03).toLocaleString() + " (3%)" : "--"}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* WORKFORCE ANALYTICS */}
      <SectionCard title="Workforce Analytics" action="Export">
        <div style={{ display: "flex", gap: 24, borderBottom: "1px solid " + C.border, paddingBottom: 12, marginBottom: 16, overflowX: "auto" }}>
          {["Overview", "Hiring", "Retention", "Diversity", "Payroll", "Performance"].map(function(tab, i) {
            return <span key={tab} style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? C.blue : C.textMuted, cursor: "pointer", whiteSpace: "nowrap", borderBottom: i === 0 ? "2px solid " + C.blue : "none", paddingBottom: 4 }}>{tab}</span>;
          })}
        </div>
        <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
          <MiniStat label="New Hires" value={workforce ? workforce.newHiresLast30Days : "--"} trend="+new this month" />
          <MiniStat label="Headcount" value={workforce ? workforce.totalHeadcount : "--"} />
          <MiniStat label="Goals Done" value={performance ? performance.completedGoals : "--"} trend={performance && performance.totalGoals ? "of " + performance.totalGoals : null} />
          <MiniStat label="Flight Risk" value={retention ? retention.highRiskCount : "0"} trend={retention && retention.highRiskCount > 0 ? "needs attention" : "stable"} />
          <MiniStat label="Missing Docs" value={compliance ? compliance.missingDocuments : "0"} trend={compliance && compliance.missingDocuments > 0 ? "action needed" : "clear"} />
        </div>
      </SectionCard>

      {/* AI ASSISTANT BAR */}
      <div style={{ background: C.navy, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.cyan + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.cyan, flexShrink: 0 }}>AI</div>
        <input
          value={question}
          onChange={function(e) { setQuestion(e.target.value); }}
          onKeyDown={function(e) { if (e.key === "Enter" && question.trim()) handleAsk(); }}
          placeholder="Ask your AI Chief of Staff anything..."
          style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit" }}
        />
        <button onClick={handleAsk} disabled={asking || !question.trim()} style={{ background: C.cyan, color: "#fff", border: "none", borderRadius: 8, padding: "11px 20px", fontSize: 13, fontWeight: 700, cursor: asking ? "default" : "pointer", opacity: asking ? 0.6 : 1, fontFamily: "inherit" }}>{asking ? "..." : "Ask"}</button>
      </div>

      {answer && (
        <SectionCard title="AI Response">
          <div style={{ fontSize: 14, lineHeight: 1.8, color: C.textMid, whiteSpace: "pre-wrap" }}>{answer}</div>
        </SectionCard>
      )}
    </div>
  );
}
