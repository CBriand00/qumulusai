import { supabase } from "../supabase";

export const hiringService = {
  id: "hiring",
  name: "Hiring Intelligence",
  async getMetrics() {
    const [{ data: apps }, { data: offers }, { data: interviews }] = await Promise.all([
      supabase.from("applications").select("id, status, created_at, role_title, department"),
      supabase.from("offers").select("id, status, signed_at, created_at"),
      supabase.from("interviews").select("id, date, created_at"),
    ]);
    const allApps = apps || [];
    const allOffers = offers || [];
    const allInterviews = interviews || [];
    const byStage = allApps.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
    const openReqsSet = new Set(allApps.filter(a => a.status !== "rejected" && a.status !== "hired").map(a => a.role_title));
    const signedOffers = allOffers.filter(o => o.signed_at).length;
    const offerAcceptRate = allOffers.length > 0 ? Math.round((signedOffers / allOffers.length) * 100) : null;
    const today = new Date();
    const upcomingInterviews = allInterviews.filter(i => i.date && new Date(i.date) >= today).length;
    return { totalApplications: allApps.length, openRequisitions: openReqsSet.size, pipelineByStage: byStage, totalOffers: allOffers.length, offerAcceptRate, upcomingInterviews, totalInterviews: allInterviews.length };
  },
  async getSummary() {
    const m = await this.getMetrics();
    return `Hiring: ${m.totalApplications} applications across ${m.openRequisitions} open requisitions. ${m.totalOffers} offers extended${m.offerAcceptRate !== null ? ` (${m.offerAcceptRate}% acceptance rate)` : ""}. ${m.upcomingInterviews} interviews scheduled.`;
  },
  async getRecentActivity(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const [{ data: apps }, { data: offers }] = await Promise.all([
      supabase.from("applications").select("full_name, role_title, created_at").gte("created_at", since),
      supabase.from("offers").select("candidate_name, role, signed_at, created_at").gte("created_at", since),
    ]);
    return { newApplications: apps || [], newOffers: offers || [] };
  },
};

export const workforceService = {
  id: "workforce",
  name: "Workforce Intelligence",
  async getMetrics() {
    const [{ data: employees }, { data: departments }] = await Promise.all([
      supabase.from("employees").select("id, status, department_id, start_date").eq("status", "active"),
      supabase.from("departments").select("id, name"),
    ]);
    const allEmployees = employees || [];
    const deptMap = (departments || []).reduce((acc, d) => { acc[d.id] = d.name; return acc; }, {});
    const byDepartment = allEmployees.reduce((acc, e) => { const name = deptMap[e.department_id] || "Unassigned"; acc[name] = (acc[name] || 0) + 1; return acc; }, {});
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newHires30d = allEmployees.filter(e => e.start_date && new Date(e.start_date) >= thirtyDaysAgo).length;
    return { totalHeadcount: allEmployees.length, headcountByDepartment: byDepartment, newHiresLast30Days: newHires30d };
  },
  async getSummary() {
    const m = await this.getMetrics();
    return `Workforce: ${m.totalHeadcount} active employees across ${Object.keys(m.headcountByDepartment).length} departments. ${m.newHiresLast30Days} new hires in the last 30 days.`;
  },
  async getRecentActivity(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data } = await supabase.from("employees").select("full_name, role_title, start_date, created_at").gte("created_at", since);
    return { newEmployees: data || [] };
  },
};

export const retentionService = {
  id: "retention", name: "Retention Intelligence",
  async getMetrics() {
    const { data: flightRisk } = await supabase.from("flight_risk_scores").select("risk_level");
    const { data: engagement } = await supabase.from("engagement_scores").select("score");
    const risks = flightRisk || []; const scores = engagement || [];
    return { highRiskCount: risks.filter(r => r.risk_level === "high").length, avgEngagementScore: scores.length ? Math.round(scores.reduce((s, e) => s + e.score, 0) / scores.length) : null };
  },
  async getSummary() {
    const m = await this.getMetrics();
    if (m.highRiskCount === 0 && m.avgEngagementScore === null) return "Retention: no data recorded yet.";
    return `Retention: ${m.highRiskCount} employees flagged high flight-risk.${m.avgEngagementScore !== null ? ` Average engagement score ${m.avgEngagementScore}/100.` : ""}`;
  },
  async getRecentActivity() { return { items: [] }; },
};

export const performanceService = {
  id: "performance", name: "Performance Intelligence",
  async getMetrics() {
    const { data: goals } = await supabase.from("goals").select("status");
    const allGoals = goals || [];
    return { totalGoals: allGoals.length, completedGoals: allGoals.filter(g => g.status === "completed").length };
  },
  async getSummary() {
    const m = await this.getMetrics();
    if (m.totalGoals === 0) return "Performance: no goals or reviews recorded yet.";
    return `Performance: ${m.completedGoals}/${m.totalGoals} goals completed.`;
  },
  async getRecentActivity() { return { items: [] }; },
};

export const financialService = {
  id: "financial", name: "Financial Intelligence",
  async getMetrics() {
    const { data: costs } = await supabase.from("labor_costs").select("total_cost, period");
    const allCosts = costs || [];
    return { latestLaborCost: allCosts.length ? allCosts[allCosts.length - 1].total_cost : null };
  },
  async getSummary() {
    const m = await this.getMetrics();
    if (m.latestLaborCost === null) return "Financial: no labor cost data recorded yet.";
    return `Financial: latest recorded labor cost is $${m.latestLaborCost.toLocaleString()}.`;
  },
  async getRecentActivity() { return { items: [] }; },
};

export const complianceService = {
  id: "compliance", name: "Compliance Intelligence",
  async getMetrics() {
    const { data: docs } = await supabase.from("required_documents").select("status");
    const { data: certs } = await supabase.from("certifications").select("status, expiry_date");
    const allDocs = docs || []; const allCerts = certs || [];
    const ninetyDays = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    return { missingDocuments: allDocs.filter(d => d.status === "missing").length, expiringSoonCerts: allCerts.filter(c => c.expiry_date && new Date(c.expiry_date) <= ninetyDays).length };
  },
  async getSummary() {
    const m = await this.getMetrics();
    if (m.missingDocuments === 0 && m.expiringSoonCerts === 0) return "Compliance: no outstanding items recorded yet.";
    return `Compliance: ${m.missingDocuments} missing documents, ${m.expiringSoonCerts} certifications expiring within 90 days.`;
  },
  async getRecentActivity() { return { items: [] }; },
};
