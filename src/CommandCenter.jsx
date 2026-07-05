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

function MiniStat({ label, value, trend, onClick, active }) {
  return (
    <div onClick={onClick} style={{ textAlign: "center", flex: 1, cursor: onClick ? "pointer" : "default", borderRadius: 8, padding: "8px 4px", background: active ? "#EEF2FF" : "transparent", transition: "background 0.15s" }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = "#EEF2FF"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: active ? C.blue : onClick ? C.textDark : C.textDark }}>{value}</div>
      <div style={{ fontSize: 11, color: active ? C.blue : C.textMuted, marginTop: 4, fontWeight: active ? 700 : 400 }}>{label}</div>
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
  const [drilldown, setDrilldown] = useState(null);
  const [drillData, setDrillData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const { isMobile } = useBreakpoint();

  async function openDrilldown(type) {
    if (drilldown === type) { setDrilldown(null); setDrillData(null); return; }
    setDrilldown(type); setDrillData(null);
    if (type === "headcount") {
      var { data } = await supabase.from("employees").select("id, full_name, role_title, department_id, start_date, status, email").eq("status", "active").order("full_name");
      var { data: depts } = await supabase.from("departments").select("id, name");
      var deptMap = (depts || []).reduce(function(m, d) { m[d.id] = d.name; return m; }, {});
      setDrillData((data || []).map(function(e) { return { ...e, department: deptMap[e.department_id] || "—" }; }));
    } else if (type === "missing_docs") {
      var { data } = await supabase.from("required_documents").select("document_name, status, employees(id, full_name, role_title, email)").eq("status", "missing");
      setDrillData(data || []);
    } else if (type === "flight_risk") {
      var { data } = await supabase.from("flight_risk_scores").select("risk_score, risk_level, employees(id, full_name, role_title, email)").in("risk_level", ["high", "medium"]).order("risk_score", { ascending: false });
      setDrillData(data || []);
    } else if (type === "goals") {
      var { data: goals } = await supabase.from("goals").select("title, status, due_date, employee_id, employees(id, full_name, role_title, email)").order("due_date");
      var byEmp = {};
      (goals || []).forEach(function(g) {
        var emp = g.employees;
        if (!emp) return;
        var key = emp.id;
        if (!byEmp[key]) byEmp[key] = { emp, goals: [], allDone: true };
        byEmp[key].goals.push(g);
        if (g.status !== "completed") byEmp[key].allDone = false;
      });
      var rows = Object.values(byEmp).sort(function(a, b) { return a.allDone === b.allDone ? 0 : a.allDone ? -1 : 1; });
      setDrillData(rows);
    }
  }

  async function downloadCensus() {
    setExporting(true);
    try {
      var results = await Promise.all([
        supabase.from("employees").select("*").order("full_name"),
        supabase.from("departments").select("id, name"),
        supabase.from("compensation_bands").select("role_title, min_salary, max_salary, currency"),
        supabase.from("employee_onboarding_docs").select("employee_id, w4_filing_status, w4_dependents, dd_bank_name, dd_account_type, i9_address, i9_city, i9_state, i9_zip, i9_dob, i9_ssn_last4, i9_phone, i9_email, i9_attestation, status"),
        supabase.from("pay_stubs").select("employee_id, gross_pay, federal_tax, state_tax, social_security, medicare, net_pay, pay_period_end").order("pay_period_end", { ascending: false }),
        supabase.from("engagement_scores").select("employee_id, score, recorded_at").order("recorded_at", { ascending: false }),
        supabase.from("flight_risk_scores").select("employee_id, risk_level, risk_score, computed_at").order("computed_at", { ascending: false }),
      ]);
      var emps = results[0].data || [];
      var empNameMap = emps.reduce(function(m, e) { m[e.id] = e.full_name; return m; }, {});
      var deptMap = (results[1].data || []).reduce(function(m, d) { m[d.id] = d.name; return m; }, {});
      var bandMap = (results[2].data || []).reduce(function(m, b) { m[b.role_title] = b; return m; }, {});
      var docMap = (results[3].data || []).reduce(function(m, d) { if (!m[d.employee_id]) m[d.employee_id] = d; return m; }, {});
      var stubMap = (results[4].data || []).reduce(function(m, s) { if (!m[s.employee_id]) m[s.employee_id] = s; return m; }, {});
      var engMap = (results[5].data || []).reduce(function(m, e) { if (!m[e.employee_id]) m[e.employee_id] = e; return m; }, {});
      var riskMap = (results[6].data || []).reduce(function(m, r) { if (!m[r.employee_id]) m[r.employee_id] = r; return m; }, {});

      var today = new Date();
      var attestLabels = { citizen: "U.S. Citizen", noncitizen_national: "Noncitizen National", lawful_permanent_resident: "Permanent Resident", alien_authorized: "Authorized Alien" };

      var headers = [
        "Employee ID", "Full Name", "Work Email", "Personal Email", "Phone", "Date of Birth", "SSN (Last 4)",
        "Home Address", "City", "State", "ZIP", "Work Authorization",
        "Department", "Job Title", "Reports To", "Employment Status", "Start Date", "Tenure (Years)",
        "Pay Type", "Base Salary", "Bonus Target %", "Equity Units",
        "Salary Band Min", "Salary Band Max", "Compa-Ratio", "Currency",
        "Latest Gross Pay", "Federal Tax", "State Tax", "Social Security", "Medicare", "Latest Net Pay",
        "W-4 Filing Status", "W-4 Dependents", "Direct Deposit Bank", "Account Type",
        "Engagement Score", "Flight Risk Level", "Flight Risk Score", "Onboarding Doc Status",
      ];

      var rows = emps.map(function(e) {
        var doc = docMap[e.id] || {};
        var band = bandMap[e.role_title] || {};
        var stub = stubMap[e.id] || {};
        var eng = engMap[e.id] || {};
        var risk = riskMap[e.id] || {};
        var tenure = e.start_date ? ((today - new Date(e.start_date)) / (365.25 * 86400000)).toFixed(1) : "";
        // Prefer real base salary; else annualize latest gross; else band midpoint.
        var baseSalary = e.base_salary != null ? Math.round(e.base_salary)
          : stub.gross_pay ? Math.round(stub.gross_pay * 12)
          : (band.min_salary && band.max_salary ? Math.round((band.min_salary + band.max_salary) / 2) : "");
        var midpoint = band.min_salary && band.max_salary ? (band.min_salary + band.max_salary) / 2 : null;
        var compaRatio = (baseSalary && midpoint) ? (baseSalary / midpoint).toFixed(2) : "";
        return [
          e.id, e.full_name, e.email, doc.i9_email || "", doc.i9_phone || "",
          doc.i9_dob || "", doc.i9_ssn_last4 ? "XXX-XX-" + doc.i9_ssn_last4 : "",
          doc.i9_address || "", doc.i9_city || "", doc.i9_state || "", doc.i9_zip || "",
          attestLabels[doc.i9_attestation] || "",
          deptMap[e.department_id] || "", e.role_title, e.manager_id ? (empNameMap[e.manager_id] || "") : "", e.status, e.start_date || "", tenure,
          e.pay_type || "salary", baseSalary, e.bonus_target_pct != null ? e.bonus_target_pct : "", e.equity_units != null ? e.equity_units : "",
          band.min_salary || "", band.max_salary || "", compaRatio, band.currency || "USD",
          stub.gross_pay || "", stub.federal_tax || "", stub.state_tax || "", stub.social_security || "", stub.medicare || "", stub.net_pay || "",
          doc.w4_filing_status || "", doc.w4_dependents != null ? doc.w4_dependents : "", doc.dd_bank_name || "", doc.dd_account_type || "",
          eng.score != null ? eng.score : "", risk.risk_level || "", risk.risk_score != null ? risk.risk_score : "", doc.status || "not started",
        ];
      });

      function esc(v) {
        var s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }
      var csv = "﻿" + [headers].concat(rows).map(function(r) { return r.map(esc).join(","); }).join("\r\n");
      var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "QumulusAI_Employee_Census_" + today.toISOString().split("T")[0] + ".csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Census export failed", err);
    }
    setExporting(false);
  }


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
          <MiniStat label="New Hires" value={workforce ? workforce.newHiresLast30Days : "--"} trend="+new this month" onClick={function() { if (onNavigate) onNavigate("onboard"); }} />
          <MiniStat label="Headcount" value={workforce ? workforce.totalHeadcount : "--"} onClick={function() { openDrilldown("headcount"); }} active={drilldown === "headcount"} />
          <MiniStat label="Goals Done" value={performance ? performance.completedGoals : "--"} trend={performance && performance.totalGoals ? "of " + performance.totalGoals : null} onClick={function() { openDrilldown("goals"); }} active={drilldown === "goals"} />
          <MiniStat label="Flight Risk" value={retention ? retention.highRiskCount : "0"} trend={retention && retention.highRiskCount > 0 ? "needs attention" : "stable"} onClick={function() { openDrilldown("flight_risk"); }} active={drilldown === "flight_risk"} />
          <MiniStat label="Missing Docs" value={compliance ? compliance.missingDocuments : "0"} trend={compliance && compliance.missingDocuments > 0 ? "action needed" : "clear"} onClick={function() { openDrilldown("missing_docs"); }} active={drilldown === "missing_docs"} />
        </div>
      </SectionCard>

      {/* DRILL-DOWN PANEL */}
      {drilldown && (
        <SectionCard title={
          drilldown === "headcount" ? "Employee Census" :
          drilldown === "missing_docs" ? "Missing Documents" :
          drilldown === "flight_risk" ? "Flight Risk Employees" :
          "Goals & Performance"
        } action="✕ Close" onClick={function() { setDrilldown(null); setDrillData(null); }}>
          {!drillData ? (
            <div style={{ color: C.textMuted, fontSize: 13, padding: "12px 0" }}>Loading…</div>
          ) : drilldown === "headcount" ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 12, color: C.textMuted }}>{drillData.length} active employee{drillData.length !== 1 ? "s" : ""} · full census includes demographics, job, and pay profile</div>
                <button onClick={function(ev) { ev.stopPropagation(); downloadCensus(); }} disabled={exporting}
                  style={{ fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 8, background: exporting ? C.textMuted : C.emerald, color: "#fff", border: "none", cursor: exporting ? "default" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {exporting ? "Preparing…" : "⬇ Download Census (Excel)"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {drillData.map(function(e) {
                  return (
                    <div key={e.id} onClick={function(ev) { ev.stopPropagation(); if (onNavigate) onNavigate("employee", e.id); }}
                      title="View full profile"
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.bg, borderRadius: 8, cursor: "pointer", border: "1px solid transparent", transition: "border-color 0.15s, background 0.15s" }}
                      onMouseEnter={function(ev) { ev.currentTarget.style.borderColor = C.blue + "50"; ev.currentTarget.style.background = C.blue + "08"; }}
                      onMouseLeave={function(ev) { ev.currentTarget.style.borderColor = "transparent"; ev.currentTarget.style.background = C.bg; }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.blue + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: C.blue, flexShrink: 0 }}>
                        {e.full_name ? e.full_name.split(" ").map(function(w) { return w[0]; }).join("").slice(0,2) : "?"}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.full_name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{e.role_title} · {e.department}</div>
                      </div>
                      <span style={{ fontSize: 14, color: C.blue, flexShrink: 0 }}>→</span>
                    </div>
                  );
                })}
              </div>
              {drillData.length === 0 && <p style={{ color: C.textMuted, fontSize: 13 }}>No active employees found.</p>}
            </div>
          ) : drilldown === "missing_docs" ? (
            <div>
              {drillData.length === 0 ? <p style={{ color: C.emerald, fontSize: 13, fontWeight: 600 }}>✓ All documents are on file.</p> : drillData.map(function(row, i) {
                var emp = row.employees;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < drillData.length - 1 ? "1px solid " + C.border : "none", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>{emp ? emp.full_name : "Unknown"}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{emp ? emp.role_title : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: "#FEF2F2", color: C.rose, borderRadius: 6, padding: "3px 9px" }}>{row.document_name}</span>
                      {emp && emp.email && <a href={"mailto:" + emp.email} style={{ fontSize: 11, color: C.blue, fontWeight: 600, textDecoration: "none" }}>Email →</a>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : drilldown === "flight_risk" ? (
            <div>
              {drillData.length === 0 ? <p style={{ color: C.emerald, fontSize: 13, fontWeight: 600 }}>✓ No high or medium flight risk employees.</p> : drillData.map(function(row, i) {
                var emp = row.employees;
                var color = row.risk_level === "high" ? C.rose : C.amber;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < drillData.length - 1 ? "1px solid " + C.border : "none", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>{emp ? emp.full_name : "Unknown"}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{emp ? emp.role_title : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: color + "15", color, borderRadius: 6, padding: "3px 9px", textTransform: "capitalize" }}>{row.risk_level} risk · {row.risk_score}</span>
                      {emp && emp.email && <a href={"mailto:" + emp.email} style={{ fontSize: 11, color: C.blue, fontWeight: 600, textDecoration: "none" }}>Email →</a>}
                      {emp && emp.id && <button onClick={function() { if (onNavigate) onNavigate("employee", emp.id); }} style={{ fontSize: 11, color: C.blue, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Profile →</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : drilldown === "goals" ? (
            <div>
              {drillData.length === 0 ? <p style={{ color: C.textMuted, fontSize: 13 }}>No goals found.</p> : (function() {
                var pending = drillData.filter(function(r) { return !r.allDone; });
                if (pending.length === 0) return <p style={{ color: C.emerald, fontSize: 13, fontWeight: 600 }}>✓ All employees have completed their goals.</p>;
                var allEmails = pending.map(function(r) { return r.emp.email; }).filter(Boolean);
                var names = pending.map(function(r) { return r.emp.full_name.split(" ")[0]; }).join(", ");
                var subject = encodeURIComponent("Action Required: Complete Your Goals Before the Deadline");
                var body = encodeURIComponent("Hi " + names + ",\n\nThis is a reminder that you have outstanding goals that need to be completed. Please log in to QumulusAI and update your progress before the deadline.\n\nIf you have any questions, feel free to reach out.\n\nThank you!");
                return (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{pending.length} employee{pending.length !== 1 ? "s" : ""} with incomplete goals</div>
                      <a href={"mailto:" + allEmails.join(",") + "?subject=" + subject + "&body=" + body}
                        style={{ fontSize: 12, fontWeight: 700, padding: "7px 16px", borderRadius: 8, background: C.blue, color: "#fff", textDecoration: "none", display: "inline-block" }}>
                        Send Reminder to All ({pending.length}) →
                      </a>
                    </div>
                    {pending.map(function(row, i) {
                      var emp = row.emp;
                      var completedCount = row.goals.filter(function(g) { return g.status === "completed"; }).length;
                      var pendingCount = row.goals.length - completedCount;
                      var singleSubject = encodeURIComponent("Goal Reminder — Action Needed");
                      var singleBody = encodeURIComponent("Hi " + emp.full_name.split(" ")[0] + ",\n\nYou have " + pendingCount + " outstanding goal" + (pendingCount !== 1 ? "s" : "") + " that need to be completed. Please log in to QumulusAI and update your progress before the deadline.\n\nThanks!");
                      return (
                        <div key={emp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < pending.length - 1 ? "1px solid " + C.border : "none", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>{emp.full_name}</div>
                            <div style={{ fontSize: 11, color: C.textMuted }}>{emp.role_title} · {completedCount}/{row.goals.length} completed · {pendingCount} remaining</div>
                          </div>
                          <a href={"mailto:" + emp.email + "?subject=" + singleSubject + "&body=" + singleBody}
                            style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: C.blue + "12", color: C.blue, border: "1px solid " + C.blue + "30", textDecoration: "none" }}>
                            Remind →
                          </a>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : null}
        </SectionCard>
      )}

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
