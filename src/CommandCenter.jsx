import { useState, useEffect } from "react";
import { useBreakpoint } from "./useBreakpoint";
import { ensureModulesRegistered, hiringService, workforceService, retentionService, performanceService, financialService, complianceService } from "./services/registerModules";
import { askIntelligenceEngine, getChiefOfStaffBriefing } from "./services/intelligenceEngine";
import { supabase } from "./supabase";
import * as T from "./theme";
import { brand } from "./brand";

ensureModulesRegistered();

// Legacy alias kept so existing drill-down markup keeps working; values now
// resolve to the design-system tokens.
const C = {
  bg: T.color.bg, bgCard: T.color.surface, textDark: T.color.text, textMid: T.color.textMid,
  textMuted: T.color.textMuted, border: T.color.border, cyan: T.color.cyan, navy: T.color.navy,
  blue: T.color.brand, violet: T.color.violet, teal: T.color.teal, amber: T.color.amber,
  rose: T.color.rose, emerald: T.color.emerald, blueLight: "#3B82F6",
};

// Calm metric card — one question, one number, one trend.
function KPICard({ label, value, trend, tone, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        ...T.card({ padding: "16px 18px" }),
        cursor: onClick ? "pointer" : "default",
        transition: `border-color ${T.dur.base} ${T.ease}, box-shadow ${T.dur.base} ${T.ease}, transform ${T.dur.base} ${T.ease}`,
        transform: hover && onClick ? "translateY(-2px)" : "none",
        boxShadow: hover && onClick ? T.shadow.md : T.shadow.sm,
        borderColor: hover && onClick ? T.color.borderStrong : T.color.border,
      }}
    >
      <div style={{ ...T.font.label, color: T.color.textMuted, marginBottom: 10 }}>{label}</div>
      <div style={{ ...T.font.metric, color: T.color.text }}>{value}</div>
      {trend && <div style={{ ...T.chipStyle(tone || "neutral"), marginTop: 10 }}>{trend}</div>}
    </div>
  );
}

function SectionCard({ title, action, children, style, onClick, actionOnClick }) {
  return (
    <div onClick={onClick} style={{ ...T.card({ padding: T.space[5] }), ...style }}>
      {(title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          {title && <div style={{ ...T.font.h2, color: T.color.text }}>{title}</div>}
          {action && <div onClick={actionOnClick} style={{ fontSize: 12.5, color: T.color.brand, fontWeight: 600, cursor: "pointer" }}>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Skeleton({ h = 100, w = "100%" }) {
  return <div style={{ height: h, width: w, borderRadius: T.radius.md, background: "#EDF0F4", animation: "qai-pulse 1.4s ease-in-out infinite" }} />;
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
      a.download = brand.name.replace(/\s+/g, "") + "_Employee_Census_" + today.toISOString().split("T")[0] + ".csv";
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

  // Executive board report — visual, print-ready one-pager in a new window.
  async function exportExecReport() {
    var [{ count: termCount }, { data: gaps }] = await Promise.all([
      supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "terminated"),
      supabase.from("training_records").select("id").eq("status", "pending"),
    ]);
    var hc = workforce ? workforce.totalHeadcount : 0;
    var attritionPct = (termCount != null && workforce && (workforce.totalHeadcount + termCount) > 0) ? Math.round((termCount / (workforce.totalHeadcount + termCount)) * 100) : null;
    var dt = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    var eng = retention && retention.avgEngagementScore != null ? retention.avgEngagementScore : null;
    var accept = hiring && hiring.offerAcceptRate != null ? hiring.offerAcceptRate : null;
    var openGaps = gaps ? gaps.length : 0;
    var missingDocs = compliance ? compliance.missingDocuments : 0;

    // Composite workforce-health score (0–100) from the signals we have.
    var parts = [], weights = [];
    if (eng != null) { parts.push(eng); weights.push(0.35); }
    if (accept != null) { parts.push(accept); weights.push(0.25); }
    if (attritionPct != null) { parts.push(Math.max(0, 100 - attritionPct * 4)); weights.push(0.20); }
    parts.push(Math.max(0, 100 - missingDocs * 8)); weights.push(0.10);
    parts.push(Math.max(0, 100 - openGaps * 2)); weights.push(0.10);
    var wsum = weights.reduce(function(s, w) { return s + w; }, 0);
    var health = Math.round(parts.reduce(function(s, p, i) { return s + p * weights[i]; }, 0) / (wsum || 1));
    var healthColor = health >= 80 ? "#059669" : health >= 60 ? "#D97706" : "#DC2626";
    var healthLabel = health >= 80 ? "Healthy" : health >= 60 ? "Watch" : "At Risk";

    var money = function(n) { return n != null ? "$" + Number(n).toLocaleString() : "—"; };
    var tile = function(label, value, sub, color) {
      return "<div class='tile'><div class='tl'>" + label + "</div><div class='tv' style='color:" + (color || "#0F172A") + "'>" + value + "</div>" + (sub ? "<div class='ts'>" + sub + "</div>" : "") + "</div>";
    };
    // Horizontal bar row
    var bar = function(label, value, max, color) {
      var pct = max > 0 ? Math.round((value / max) * 100) : 0;
      return "<div class='bar'><div class='bl'>" + label + "</div><div class='bt'><div class='bf' style='width:" + pct + "%;background:" + color + "'></div></div><div class='bv'>" + value + "</div></div>";
    };
    var funnel = hiring ? (hiring.pipelineByStage || {}) : {};
    var fmax = Math.max(hiring ? hiring.totalApplications || 1 : 1, 1);
    var cost = financial && financial.latestLaborCost ? financial.latestLaborCost : 0;

    var html =
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + brand.name + " Board Report</title><style>" +
      "*{box-sizing:border-box}body{font-family:'Inter','Helvetica Neue',sans-serif;color:#0F172A;background:#F6F7F9;margin:0;padding:32px}" +
      ".page{max-width:840px;margin:0 auto;background:#fff;border:1px solid #E9ECF1;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08)}" +
      ".head{background:linear-gradient(135deg,#0A2540,#123a63);color:#fff;padding:28px 34px;display:flex;justify-content:space-between;align-items:flex-start}" +
      ".brand{font-size:20px;font-weight:800;letter-spacing:-.02em}.brand span{color:#00B8D4}" +
      ".htitle{font-size:13px;color:#9fb4cc;margin-top:2px}.hmeta{text-align:right;font-size:11px;color:#9fb4cc;line-height:1.7}" +
      ".body{padding:28px 34px}" +
      ".hero{display:flex;align-items:center;gap:26px;padding:22px 24px;border:1px solid #E9ECF1;border-radius:14px;margin-bottom:24px;background:#FAFBFC}" +
      ".ring{width:104px;height:104px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:conic-gradient(" + healthColor + " " + (health * 3.6) + "deg,#EDF0F4 0)}" +
      ".ring div{width:80px;height:80px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}" +
      ".ring .n{font-size:26px;font-weight:800;color:" + healthColor + ";line-height:1}.ring .l{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8A97A8;margin-top:3px}" +
      ".herox h2{margin:0 0 4px;font-size:17px}.herox p{margin:0;color:#48566A;font-size:13px;line-height:1.6}" +
      ".hchip{display:inline-block;background:" + healthColor + "18;color:" + healthColor + ";font-size:11px;font-weight:800;border-radius:999px;padding:3px 12px;margin-bottom:8px}" +
      ".grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:26px}" +
      ".tile{border:1px solid #E9ECF1;border-radius:12px;padding:15px 16px}.tl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8A97A8}.tv{font-size:24px;font-weight:800;margin-top:8px;letter-spacing:-.02em}.ts{font-size:11px;color:#8A97A8;margin-top:4px}" +
      "h3{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8A97A8;margin:24px 0 12px}" +
      ".two{display:grid;grid-template-columns:1fr 1fr;gap:26px}" +
      ".bar{display:flex;align-items:center;gap:10px;margin-bottom:9px}.bl{width:84px;font-size:11px;color:#8A97A8;text-align:right;flex-shrink:0}.bt{flex:1;height:18px;background:#F1F5F9;border-radius:5px;overflow:hidden}.bf{height:100%;border-radius:5px}.bv{width:34px;font-size:12px;font-weight:700;text-align:right}" +
      ".foot{padding:16px 34px;border-top:1px solid #E9ECF1;font-size:10.5px;color:#8A97A8;line-height:1.6}" +
      ".btn{position:fixed;top:20px;right:20px;background:#0A2540;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer}" +
      "@media print{body{background:#fff;padding:0}.page{border:none;box-shadow:none}.btn{display:none}}</style></head><body>" +
      "<button class='btn' onclick='window.print()'>⎙ Save as PDF</button>" +
      "<div class='page'>" +
      "<div class='head'><div><div class='brand'>" + brand.wordmark.lead + brand.wordmark.body + "<span>" + brand.wordmark.tail + "</span></div><div class='htitle'>Executive People Report</div></div>" +
      "<div class='hmeta'>" + dt + "<br/>Confidential<br/>Board of Directors</div></div>" +
      "<div class='body'>" +
      // Hero health score
      "<div class='hero'><div class='ring'><div><div class='n'>" + health + "</div><div class='l'>Health</div></div></div>" +
      "<div class='herox'><span class='hchip'>" + healthLabel + "</span><h2>Workforce Health Score</h2>" +
      "<p>Composite of engagement, offer acceptance, attrition, and compliance signals across " + hc + " active employees.</p></div></div>" +
      // KPI tiles
      "<div class='grid'>" +
      tile("Headcount", hc, workforce && workforce.newHiresLast30Days ? "+" + workforce.newHiresLast30Days + " this month" : null) +
      tile("Open Roles", hiring ? hiring.openRequisitions : "—", hiring ? hiring.totalApplications + " applicants" : null) +
      tile("Attrition ITD", attritionPct != null ? attritionPct + "%" : "—", (termCount || 0) + " departures", attritionPct != null && attritionPct > 15 ? "#DC2626" : "#0F172A") +
      tile("Offer Accept", accept != null ? accept + "%" : "—", accept != null && accept < 80 ? "below benchmark" : "on target", accept != null && accept < 80 ? "#D97706" : "#059669") +
      tile("Engagement", eng != null ? eng : "—", "of 100", eng != null && eng >= 75 ? "#059669" : "#D97706") +
      tile("Monthly Cost", cost ? "$" + Math.round(cost / 1000) + "k" : "—", "fully loaded") +
      "</div>" +
      // Two-column visuals
      "<div class='two'><div><h3>Hiring Pipeline</h3>" +
      bar("Applied", hiring ? hiring.totalApplications || 0 : 0, fmax, "#2563EB") +
      bar("Screened", funnel.screened || funnel.screening || 0, fmax, "#4F8CF7") +
      bar("Interview", funnel.interviewing || funnel.interview || 0, fmax, "#7C3AED") +
      bar("Offered", funnel.offer || (hiring && hiring.totalOffers) || 0, fmax, "#059669") +
      bar("Hired", funnel.hired || 0, fmax, "#0D9488") +
      "</div><div><h3>Cost Allocation</h3>" +
      bar("Payroll", 74, 100, "#0A2540") +
      bar("Benefits", 16, 100, "#2563EB") +
      bar("Contractors", 7, 100, "#7C3AED") +
      bar("Other", 3, 100, "#8A97A8") +
      "<div style='margin-top:14px;font-size:12px;color:#48566A'>Total monthly · <strong>" + money(cost) + "</strong></div>" +
      "</div></div>" +
      // Compliance strip
      "<h3>Risk &amp; Compliance</h3>" +
      "<div class='grid'>" +
      tile("Flight Risk", retention ? retention.highRiskCount : "—", "high/medium", retention && retention.highRiskCount > 0 ? "#DC2626" : "#059669") +
      tile("Missing Docs", missingDocs, "outstanding", missingDocs > 0 ? "#D97706" : "#059669") +
      tile("Training Gaps", openGaps, "open items", openGaps > 0 ? "#D97706" : "#059669") +
      "</div>" +
      "</div>" +
      "<div class='foot'>Generated by the " + brand.name + " " + brand.tagline + " from live system data on " + dt + ". Health score is an internal compositeindicator, not an audited metric. Payroll tax figures are estimates; see Tax Liability for filing-ready detail.</div>" +
      "</div></body></html>";
    var w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }

  var now = new Date();
  var hour = now.getHours();
  var daypart = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  var dateLine = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  var funnel = hiring ? (hiring.pipelineByStage || {}) : {};
  var funnelMax = Math.max(hiring ? hiring.totalApplications || 1 : 1, 1);

  // Health strip — one question per card
  var kpis = [
    { label: "Headcount", value: workforce ? workforce.totalHeadcount : "—", trend: workforce && workforce.newHiresLast30Days ? "↑ " + workforce.newHiresLast30Days + " new" : null, tone: "good", onClick: function() { if (onNavigate) onNavigate("employee"); } },
    { label: "Open Roles", value: hiring ? hiring.openRequisitions : "—", trend: hiring ? hiring.totalApplications + " applicants" : null, tone: "info", onClick: function() { if (onNavigate) onNavigate("recruit"); } },
    { label: "Time to Fill", value: hiring && hiring.avgDaysOpen ? hiring.avgDaysOpen + "d" : "—", onClick: function() { if (onNavigate) onNavigate("recruit"); } },
    { label: "Monthly Cost", value: financial && financial.latestLaborCost ? "$" + Math.round(financial.latestLaborCost / 1000) + "k" : "—", onClick: function() { if (onNavigate) onNavigate("payroll"); } },
    { label: "Attrition Risk", value: retention && retention.highRiskCount ? retention.highRiskCount : "0", trend: retention && retention.highRiskCount ? "needs review" : "stable", tone: retention && retention.highRiskCount ? "bad" : "good", onClick: function() { openDrilldown("flight_risk"); } },
    { label: "Engagement", value: retention && retention.avgEngagementScore ? retention.avgEngagementScore : "—", trend: retention && retention.avgEngagementScore ? "of 100" : null, tone: retention && retention.avgEngagementScore >= 75 ? "good" : "warn" },
  ];

  // AI priorities — proactive "what needs attention"
  var priorities = [];
  if (retention && retention.highRiskCount > 0) priorities.push({ tone: "bad", title: retention.highRiskCount + " employee" + (retention.highRiskCount > 1 ? "s" : "") + " at flight risk", sub: "Retention signals elevated over the next 60 days", action: "Review", onClick: function() { openDrilldown("flight_risk"); } });
  if (compliance && compliance.missingDocuments > 0) priorities.push({ tone: "warn", title: compliance.missingDocuments + " compliance document" + (compliance.missingDocuments > 1 ? "s" : "") + " missing", sub: "Required paperwork outstanding", action: "Resolve", onClick: function() { if (onNavigate) onNavigate("compliance"); } });
  if (hiring && hiring.offerAcceptRate != null && hiring.offerAcceptRate < 80) priorities.push({ tone: "warn", title: "Offer acceptance at " + hiring.offerAcceptRate + "%", sub: "Below benchmark — review compensation packages", action: "Recruiting", onClick: function() { if (onNavigate) onNavigate("recruit"); } });
  if (performance && performance.totalGoals > 0 && performance.completedGoals < performance.totalGoals) priorities.push({ tone: "info", title: (performance.totalGoals - performance.completedGoals) + " goals still open", sub: performance.completedGoals + " of " + performance.totalGoals + " completed org-wide", action: "View", onClick: function() { openDrilldown("goals"); } });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space[5], fontFamily: T.font.family }}>
      <style>{"@keyframes qai-pulse{0%,100%{opacity:1}50%{opacity:0.5}}"}</style>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ ...T.font.label, color: T.color.textMuted, marginBottom: 7 }}>{dateLine}</div>
          <h1 style={{ margin: 0, ...T.font.display, color: T.color.text }}>Good {daypart}, Chateau</h1>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={exportExecReport} disabled={loadingMetrics} title="One-page board summary" style={{ ...T.btn("secondary"), opacity: loadingMetrics ? 0.5 : 1 }}>⎙ Board Report</button>
          <button onClick={function() { if (onNavigate) onNavigate("recruit"); }} style={T.btn("primary")}>+ New Requisition</button>
        </div>
      </div>

      {/* HEALTH STRIP */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: 12 }}>
        {loadingMetrics
          ? [0, 1, 2, 3, 4, 5].map(function(i) { return <Skeleton key={i} h={104} />; })
          : kpis.map(function(k) { return <KPICard key={k.label} {...k} />; })}
      </div>

      {/* NEEDS ATTENTION — AI priorities */}
      <div style={T.card({ padding: 0, overflow: "hidden" })}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid " + T.color.border, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg," + T.color.brand + "," + T.color.violet + ")", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>✦</div>
            <div style={{ ...T.font.h2, color: T.color.text }}>What needs your attention</div>
          </div>
          {!loadingMetrics && <span style={T.chipStyle(priorities.length ? "warn" : "good")}>{priorities.length ? priorities.length + " to review" : "All clear"}</span>}
        </div>
        {loadingMetrics ? (
          <div style={{ padding: "22px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton h={16} w="70%" /><Skeleton h={16} w="55%" />
          </div>
        ) : priorities.length === 0 ? (
          <div style={{ padding: "30px 20px", textAlign: "center", color: T.color.textMuted, fontSize: 13 }}>✓ No critical items. Everything is on track.</div>
        ) : priorities.map(function(p, i) {
          return (
            <div key={i} onClick={p.onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", borderBottom: i < priorities.length - 1 ? "1px solid " + T.color.border : "none", cursor: "pointer", transition: "background " + T.dur.fast + " " + T.ease }}
              onMouseEnter={function(e) { e.currentTarget.style.background = T.color.surfaceAlt; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = "transparent"; }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: p.tone === "bad" ? T.color.rose : p.tone === "warn" ? T.color.amber : T.color.brand, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: T.color.text }}>{p.title}</div>
                <div style={{ fontSize: 12, color: T.color.textMuted }}>{p.sub}</div>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.color.brand, whiteSpace: "nowrap" }}>{p.action} →</span>
            </div>
          );
        })}
      </div>

      {/* SUPPORTING — pipeline + cost */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "3fr 2fr", gap: 14 }}>
        <SectionCard title="Hiring pipeline" action="Recruiting →" actionOnClick={function() { if (onNavigate) onNavigate("recruit"); }}>
          <FunnelBar label="Applied" value={hiring ? hiring.totalApplications || 0 : 0} max={funnelMax} color={T.color.brand} />
          <FunnelBar label="Screened" value={funnel.screened || funnel.screening || 0} max={funnelMax} color="#4F8CF7" />
          <FunnelBar label="Interviewing" value={funnel.interviewing || funnel.interview || 0} max={funnelMax} color={T.color.violet} />
          <FunnelBar label="Offered" value={funnel.offer || (hiring && hiring.totalOffers) || 0} max={funnelMax} color={T.color.emerald} />
          <FunnelBar label="Hired" value={funnel.hired || 0} max={funnelMax} color={T.color.teal} />
        </SectionCard>
        <SectionCard title="Monthly cost" action="Payroll →" actionOnClick={function() { if (onNavigate) onNavigate("payroll"); }}>
          <div style={{ ...T.font.metric, color: T.color.text, marginBottom: 14 }}>{financial && financial.latestLaborCost ? "$" + financial.latestLaborCost.toLocaleString() : "—"}</div>
          {[["Payroll", 0.74], ["Benefits", 0.16], ["Contractors", 0.07], ["Other", 0.03]].map(function(rw) {
            return (
              <div key={rw[0]} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "5px 0" }}>
                <span style={{ color: T.color.textMuted }}>{rw[0]}</span>
                <span style={{ color: T.color.text, fontWeight: 600 }}>{financial && financial.latestLaborCost ? "$" + Math.round(financial.latestLaborCost * rw[1]).toLocaleString() + " · " + Math.round(rw[1] * 100) + "%" : "—"}</span>
              </div>
            );
          })}
        </SectionCard>
      </div>

      {/* WORKFORCE ANALYTICS */}
      <SectionCard title="Explore">
        <div style={{ display: "flex", gap: 24, borderBottom: "1px solid " + C.border, paddingBottom: 12, marginBottom: 16, overflowX: "auto" }}>
          {[
            { label: "Overview",    dest: null },
            { label: "Hiring",      dest: "recruit" },
            { label: "Retention",   dest: "executive" },
            { label: "Diversity",   dest: "diversity" },
            { label: "Payroll",     dest: "payroll" },
            { label: "Performance", dest: "employee" },
          ].map(function(tab, i) {
            var isActive = i === 0;
            return <span key={tab.label}
              onClick={function() { if (tab.dest && onNavigate) onNavigate(tab.dest); }}
              style={{ fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? C.blue : C.textMuted, cursor: "pointer", whiteSpace: "nowrap", borderBottom: isActive ? "2px solid " + C.blue : "2px solid transparent", paddingBottom: 4, transition: "color 0.15s, border-color 0.15s" }}
              onMouseEnter={function(e) { if (!isActive) { e.currentTarget.style.color = C.blue; e.currentTarget.style.borderBottomColor = C.border; } }}
              onMouseLeave={function(e) { if (!isActive) { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderBottomColor = "transparent"; } }}>
              {tab.label}
            </span>;
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
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button onClick={function(ev) { ev.stopPropagation(); if (onNavigate) onNavigate("compliance"); }}
                  style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#D97706", cursor: "pointer", fontFamily: "inherit" }}>
                  ⚖ Open HR Compliance →
                </button>
              </div>
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
                var body = encodeURIComponent("Hi " + names + ",\n\nThis is a reminder that you have outstanding goals that need to be completed. Please log in to " + brand.name + " and update your progress before the deadline.\n\nIf you have any questions, feel free to reach out.\n\nThank you!");
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
                      var singleBody = encodeURIComponent("Hi " + emp.full_name.split(" ")[0] + ",\n\nYou have " + pendingCount + " outstanding goal" + (pendingCount !== 1 ? "s" : "") + " that need to be completed. Please log in to " + brand.name + " and update your progress before the deadline.\n\nThanks!");
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
      <div style={{ background: T.color.navy, borderRadius: T.radius.md, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, boxShadow: T.shadow.sm }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg," + T.color.cyan + "," + T.color.brand + ")", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", flexShrink: 0 }}>✦</div>
        <input
          value={question}
          onChange={function(e) { setQuestion(e.target.value); }}
          onKeyDown={function(e) { if (e.key === "Enter" && question.trim()) handleAsk(); }}
          placeholder="Ask your AI Chief of Staff…"
          style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", fontFamily: T.font.family }}
        />
        <button onClick={handleAsk} disabled={asking || !question.trim()} style={{ background: "#fff", color: T.color.navy, border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: asking ? "default" : "pointer", opacity: asking || !question.trim() ? 0.6 : 1, fontFamily: T.font.family }}>{asking ? "…" : "Ask"}</button>
      </div>

      {answer && (
        <SectionCard title="AI Response">
          <div style={{ fontSize: 14, lineHeight: 1.8, color: T.color.textMid, whiteSpace: "pre-wrap" }}>{answer}</div>
        </SectionCard>
      )}
    </div>
  );
}
