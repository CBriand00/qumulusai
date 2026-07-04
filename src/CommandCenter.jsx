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

// â”€â”€â”€ MINI COMPONENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function KPICard({ icon, label, value, subtitle, accent, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        background: "#fff",
        border: `1px solid ${hover && onClick ? accent || C.blue : C.border}`,
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
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${accent || C.blue}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{label}</div>
        {onClick && <div style={{ marginLeft: "auto", fontSize: 16, color: C.textMuted, opacity: 0.4 }}>â‹®</div>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.textDark, letterSpacing: "-0.02em" }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: C.emerald, marginTop: 6, fontWeight: 500 }}>{subtitle}</div>}
    </div>
  );
}

function SectionCard({ title, action, children, style }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px", ...style }}>
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
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <div style={{ width: 90, fontSize: 12, color: C.textMuted, textAlign: "right", flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 24, background: "#F1F5F9", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color || C.blue, borderRadius: 6, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ width: 40, fontSize: 13, fontWeight: 700, color: C.textDark, textAlign: "right" }}>{value}</div>
    </div>
  );
}

function DonutChart({ data, total, label }) {
  let cumulative = 0;
  const colors = [C.blue, C.violet, C.emerald, C.amber, C.teal, C.rose];
  const segments = data.map((d, i) => {
    const pct = total > 0 ? (d.value / total) * 100 : 0;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start, color: colors[i % colors.length] };
  });

  const gradientParts = segments.map(s => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(", ");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{ width: 120, height: 120, borderRadius: "50%", background: `conic-gradient(${gradientParts})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.textDark }}>{total}</div>
          <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: C.textMid }}>{s.name}</span>
            <span style={{ color: C.textDark, fontWeight: 700, marginLeft: "auto" }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityItem({ icon, text, time }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${C.blue}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>{text}</div>
      <div style={{ fontSize: 11, color: C.textMuted, flexShrink: 0, whiteSpace: "nowrap" }}>{time}</div>
    </div>
  );
}

function InsightItem({ text }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.amber, fontSize: 14, flexShrink: 0 }}>âš¡</span>
      <span style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function MiniStat({ label, value, trend }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.textDark }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{label}</div>
      {trend && <div style={{ fontSize: 11, color: trend.startsWith("+") || trend.startsWith("â†‘") ? C.emerald : C.rose, marginTop: 2, fontWeight: 600 }}>{trend}</div>}
    </div>
  );
}

// â”€â”€â”€ MAIN COMMAND CENTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      try {
        const activity = await hiringService.getRecentActivity(72);
        setRecentHiring(activity);
      } catch(e) {}
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

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // Derive funnel data from hiring metrics
  const funnel = hiring?.pipelineByStage || {};
  const funnelMax = Math.max(hiring?.totalApplications || 1, ...Object.values(funnel), 1);

  // Derive department data from workforce
  const deptData = workforce?.headcountByDepartment
    ? Object.entries(workforce.headcountByDepartment).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6)
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* â”€â”€â”€ HEADER â”€â”€â”€ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.textDark }}>Command Center</h1>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: 14 }}>Welcome back, Chateau. Here's what's happening across your workforce.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>Last updated: {timeStr}</span>
          <button onClick={() => onNavigate?.("recruit")} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ New Requisition</button>
        </div>
      </div>

      {/* â”€â”€â”€ KPI ROW â”€â”€â”€ */}
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
        <KPICard icon="ðŸ‘¥" label="Headcount" value={workforce?.totalHeadcount ?? "â€”"} subtitle={workforce?.newHiresLast30Days ? `â†‘ ${workforce.newHiresLast30Days} new this month` : null} accent={C.blue} onClick={() => onNavigate?.("employee")} />
        <KPICard icon="ðŸ“‹" label="Open Requisitions" value={hiring?.openRequisitions ?? "â€”"} subtitle={hiring?.totalApplications ? `${hiring.totalApplications} total applications` : null} accent={C.violet} onClick={() => onNavigate?.("recruit")} />
        <KPICard icon="â±" label="Time to Fill" value={hiring?.avgDaysOpen ?? "â€”"} accent={C.teal} onClick={() => onNavigate?.("recruit")} />
        <KPICard icon="ðŸ’°" label="Labor Cost" value={financial?.latestLaborCost ? `$${(financial.latestLaborCost / 1000).toFixed(0)}k` : "â€”"} accent={C.amber} onClick={() => onNavigate?.("payroll")} />
        <KPICard icon="ðŸ“ˆ" label="Attrition Risk" value={retention?.highRiskCount ? `${retention.highRiskCount} high` : "Low"} accent={C.rose} />
        <KPICard icon="ðŸ’š" label="Engagement" value={retention?.avgEngagementScore ? `${retention.avgEngagementScore}/100` : "â€”"} accent={C.emerald} />
      </div>

      {/* â”€â”€â”€ CHARTS ROW â”€â”€â”€ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
        {/* Hiring Funnel */}
        <SectionCard title="Hiring Funnel">
          <FunnelBar label="Applied" value={hiring?.totalApplications || 0} max={funnelMax} color={C.blue} />
          <FunnelBar label="Screened" value={funnel.screened || funnel.screening || 0} max={funnelMax} color="#4F8CF7" />
          <FunnelBar label="Interviewing" value={funnel.interviewing || funnel.interview || 0} max={funnelMax} color={C.violet} />
          <FunnelBar label="Offered" value={hiring?.totalOffers || 0} max={funnelMax} color={C.emerald} />
          <FunnelBar label="Hired" value={funnel.hired || 0} max={funnelMax} color={C.teal} />
        </SectionCard>

        {/* Requisitions by Department */}
        <SectionCard title="Requisitions by Department">
          {deptData.length > 0 ? (
            <DonutChart data={deptData} total={workforce?.totalHeadcount || 0} label="Total" />
          ) : (
            <div style={{ color: C.textMuted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>Loading department data...</div>
          )}
        </SectionCard>

        {/* Live Activity */}
        <SectionCard title="Live Activity" action="View all â†’">
          {recentHiring?.newApplications?.slice(0, 4).map((app, i) => (
            <ActivityItem key={i} icon="ðŸ“„" text={<><strong>{app.full_name}</strong> applied for {app.role_title}</>} time={new Date(app.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} />
          ))}
          {recentHiring?.newOffers?.slice(0, 2).map((offer, i) => (
            <ActivityItem key={`o${i}`} icon="âœ‰ï¸" text={<><strong>{offer.candidate_name}</strong> received offer for {offer.role}</>} time={new Date(offer.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} />
          ))}
          {(!recentHiring || (recentHiring.newApplications?.length === 0 && recentHiring.newOffers?.length === 0)) && (
            <div style={{ color: C.textMuted, fontSize: 12, padding: "16px 0", textAlign: "center" }}>No recent activity in the last 72 hours</div>
          )}
        </SectionCard>
      </div>

      {/* â”€â”€â”€ BOTTOM ROW â”€â”€â”€ */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
        {/* Top Requisitions */}
        <SectionCard title="Top Requisitions" action="View all â†’" style={{ cursor: "pointer" }} onClick={() => onNavigate?.("recruit")}>
          {(hiring?.pipelineByStage) ? Object.entries(hiring.pipelineByStage).slice(0, 4).map(([stage, count], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.textDark }}>{stage}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>Pipeline stage</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.textDark }}>{count}</div>
            </div>
          )) : <div style={{ color: C.textMuted, fontSize: 12 }}>Loading...</div>}
        </SectionCard>

        {/* AI Insights */}
        <SectionCard title="AI Insights">
          {briefingLoading ? (
            <div style={{ color: C.cyan, fontSize: 12, fontWeight: 600 }}>â—ˆ Generating insights...</div>
          ) : (
            <>
              {retention?.highRiskCount > 0 && <InsightItem text={`Retention risk detected for ${retention.highRiskCount} employee${retention.highRiskCount > 1 ? "s" : ""} in the next 60 days.`} />}
              {compliance?.missingDocuments > 0 && <InsightItem text={`${compliance.missingDocuments} missing compliance documents need attention.`} />}
              {hiring?.offerAcceptRate && <InsightItem text={`Offer acceptance rate is ${hiring.offerAcceptRate}%. ${hiring.offerAcceptRate >= 80 ? "Strong performance." : "Below benchmark, review comp packages."}`} />}
              {performance?.totalGoals > 0 && <InsightItem text={`${performance.completedGoals}/${performance.totalGoals} goals completed across the organization.`} />}
              {!retention?.highRiskCount && !compliance?.missingDocuments && <InsightItem text="All systems nominal. No critical risks detected." />}
            </>
          )}
        </SectionCard>

        {/* Workforce Cost */}
        <SectionCard title="Workforce Cost Overview" style={{ cursor: "pointer" }} onClick={() => onNavigate?.("payroll")}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Cost</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.textDark, marginTop: 4 }}>{financial?.latestLaborCost ? `$${financial.latestLaborCost.toLocaleString()}` : "â€”"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.textMuted }}>â— Payroll</span>
              <span style={{ color: C.textDark, fontWeight: 600 }}>{financial?.latestLaborCost ? `$${Math.round(financial.latestLaborCost * 0.74).toLocaleString()} (74%)` : "â€”"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.textMuted }}>â— Benefits</span>
              <span style={{ color: C.textDark, fontWeight: 600 }}>{financial?.latestLaborCost ? `$${Math.round(financial.latestLaborCost * 0.16).toLocaleString()} (16%)` : "â€”"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.textMuted }}>â— Contractors</span>
              <span style={{ color: C.textDark, fontWeight: 600 }}>{financial?.latestLaborCost ? `$${Math.round(financial.latestLaborCost * 0.07).toLocaleString()} (7%)` : "â€”"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.textMuted }}>â— Other</span>
              <span style={{ color: C.textDark, fontWeight: 600 }}>{financial?.latestLaborCost ? `$${Math.round(financial.latestLaborCost * 0.03).toLocaleString()} (3%)` : "â€”"}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* â”€â”€â”€ WORKFORCE ANALYTICS â”€â”€â”€ */}
      <SectionCard title="Workforce Analytics" action="Export â†’">
        <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 12, marginBottom: 16, overflowX: "auto" }}>
          {["Overview", "Hiring", "Retention", "Diversity", "Payroll", "Performance"].map((tab, i) => (
            <span key={tab} style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? C.blue : C.textMuted, cursor: "pointer", whiteSpace: "nowrap", borderBottom: i === 0 ? `2px solid ${C.blue}` : "none", paddingBottom: 4 }}>{tab}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
          <MiniStat label="New Hires" value={workforce?.newHiresLast30Days ?? "â€”"} trend="â†‘ this month" />
          <MiniStat label="Headcount" value={workforce?.totalHeadcount ?? "â€”"} />
          <MiniStat label="Goals Done" value={performance?.completedGoals ?? "â€”"} trend={performance?.totalGoals ? `of ${performance.totalGoals}` : null} />
          <MiniStat label="Flight Risk" value={retention?.highRiskCount ?? "0"} trend={retention?.highRiskCount > 0 ? "needs attention" : "âœ“ stable"} />
          <MiniStat label="Missing Docs" value={compliance?.missingDocuments ?? "0"} trend={compliance?.missingDocuments > 0 ? "action needed" : "âœ“ clear"} />
        </div>
      </SectionCard>

      {/* â”€â”€â”€ AI ASSISTANT BAR â”€â”€â”€ */}
      <div style={{ background: C.navy, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${C.cyan}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>ðŸ§ </div>
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && question.trim()) handleAsk(); }}
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
