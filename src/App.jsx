import { useState, useEffect } from "react";
import Auth from "./Auth";
import { supabase } from "./supabase";
import CommandCenter from "./CommandCenter";
import CareersPortal from "./Careers";
import TalentInbox from "./TalentInbox";
import Messenger from "./Messenger";
import EmployeePortal from "./EmployeePortal";
import OfferSigning from "./OfferSigning";
import NewHirePortal from "./NewHirePortal";
// ─── QumulusAI Design Tokens ──────────────────────────────────────────────────
// Palette: deep space navy + electric cyan + warm white
// Signature: the "Q" mark and cyan glow — confident, AI-forward, boardroom-ready
const C = {
  bg:           "#F0F2F7",
  bgCard:       "#FFFFFF",
  bgSidebar:    "#080D1A",
  bgSidebarHov: "#0F1828",
  bgActive:     "#0A2540",
  

  textDark:     "#0D1117",
  textMid:      "#3D4B5C",
  textMuted:    "#7E8FA3",
  textOnDark:   "#E8EEF8",
  
  textMutedDark:"#4A6080",

  border:       "#DDE3ED",
  borderDark:   "#0F1E30",

  // Brand
  cyan:         "#00C2E0",
  cyanDark:     "#0099B8",
  cyanGlow:     "#00C2E020",
  navy:         "#0A2540",
  navyMid:      "#1A3A5C",

  // Module accents
  blue:         "#2563EB",
  blueLight:    "#3B82F6",
  violet:       "#7C3AED",
  violetLight:  "#8B5CF6",
  teal:         "#0D9488",
  tealLight:    "#14B8A6",
  amber:        "#D97706",
  amberLight:   "#F59E0B",
  rose:         "#DC2626",
  roseLight:    "#EF4444",
  emerald:      "#059669",
  emeraldLight: "#10B981",
};

const NAV = [
  { id: "home",      label: "Command Center",    icon: "❖", accent: C.cyan },
  { id: "recruit",   label: "Recruiting Engine", icon: "◈", accent: C.violet },
  { id: "onboard",   label: "Onboarding",        icon: "◎", accent: C.teal },
  { id: "manager",   label: "Manager Coach",     icon: "◇", accent: C.blue },
  { id: "employee",  label: "Employee Hub",      icon: "○", accent: C.blueLight },
  { id: "executive", label: "Workforce Intel",   icon: "◆", accent: C.amber },  
  { id: "careers", label: "Careers Portal", icon: "◉", accent: C.emerald }, { id: "inbox", label: "Talent Inbox", icon: "◎", accent: C.rose }, { id: "messenger", label: "Messenger", icon: "◈", accent: C.cyan },
];
// QumulusAI real profile: ~40 person AI infrastructure company, Atlanta GA
// $500M financing secured, scaling aggressively to 300+ employees
const EMPLOYEES = [
  { name: "Ryan Callahan", role: "GPU Infrastructure Engineer",  dept: "Infrastructure", tenure: "1.8 yrs", sentiment: 78, risk: "medium" },
  { name: "Aisha Okonkwo", role: "AI Solutions Architect",       dept: "Solutions Eng",  tenure: "0.9 yrs", sentiment: 85, risk: "low" },
  { name: "Derek Huang",   role: "Data Center Operations Lead",  dept: "DC Ops",         tenure: "2.1 yrs", sentiment: 52, risk: "high" },
  { name: "Priya Menon",   role: "Enterprise Account Executive", dept: "Sales",          tenure: "0.6 yrs", sentiment: 67, risk: "medium" },
];

const OPEN_ROLES = [
  { title: "VP of People & Culture",         dept: "People",    candidates: 9,  stage: "Interviewing", days: 41 },
  { title: "Senior GPU Infrastructure Eng",  dept: "Infra",     candidates: 34, stage: "Screening",    days: 14 },
  { title: "Director of Enterprise Sales",   dept: "Sales",     candidates: 22, stage: "Assessment",   days: 28 },
  { title: "AI Solutions Engineer - EMEA",   dept: "Solutions", candidates: 17, stage: "Offer",        days: 52 },
  { title: "Data Center Operations Manager", dept: "DC Ops",    candidates: 28, stage: "Screening",    days: 9  },
  { title: "CFO",                            dept: "Finance",   candidates: 6,  stage: "Interviewing", days: 63 },
];

// Metrics for a 40-person company that just raised $500M and is about to 10x
const METRICS = [
  { label: "Headcount",      value: "43",  delta: "+18",   trend: "up" },
  { label: "Open Roles",     value: "21",  delta: "+12",   trend: "up" },
  { label: "Time-to-Hire",   value: "38d", delta: "+10d",  trend: "down" },
  { label: "Engagement",     value: "81",  delta: "+6",    trend: "up" },
  { label: "Offer Accept",   value: "91%", delta: "+4pp",  trend: "up" },
  { label: "Attrition YTD", value: "11%", delta: "+3pp",  trend: "down" },
];

// ─── AI Hook ──────────────────────────────────────────────────────────────────
function useAI() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  const ask = async (system, user) => {
    setLoading(true);
    setResponse("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-query", {
        body: { system, messages: [{ role: "user", content: user }], max_tokens: 1000 },
      });
      if (error) throw error;
      if (data?.error) {
        setResponse("AI error: " + (typeof data.error === "string" ? data.error : JSON.stringify(data.error)));
      } else {
        setResponse(data?.content?.map(b => b.text || "").join("") || "No response.");
      }
    } catch (e) {
      setResponse("Couldn't reach AI: " + e.message);
    }
    setLoading(false);
  };

  return { ask, loading, response, setResponse };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22, ...style }}>
      {children}
    </div>
  );
}

function Label({ children, color }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: color || C.textMuted, marginBottom: 14 }}>
      {children}
    </div>
  );
}

function Badge({ label }) {
  const map = {
    low:          { bg: "#05966910", text: C.emerald },
    medium:       { bg: "#D9770610", text: C.amber },
    high:         { bg: "#DC262610", text: C.rose },
    Interviewing: { bg: "#7C3AED10", text: C.violet },
    Offer:        { bg: "#05966910", text: C.emerald },
    Screening:    { bg: "#D9770610", text: C.amber },
    Assessment:   { bg: "#0D948810", text: C.teal },
  };
  const s = map[label] || { bg: "#00000008", text: C.textMid };
  return (
    <span style={{ background: s.bg, color: s.text, borderRadius: 5, padding: "2px 9px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
      {label}
    </span>
  );
}

function AIBox({ loading, response, accent }) {
  if (!loading && !response) return null;
  const a = accent || C.cyan;
  return (
    <div style={{ background: `${a}08`, border: `1px solid ${a}25`, borderLeft: `3px solid ${a}`, borderRadius: 8, padding: 18, marginTop: 14, fontSize: 14, lineHeight: 1.8, color: C.textDark, whiteSpace: "pre-wrap" }}>
      {loading
        ? <span style={{ color: a, fontSize: 13, fontWeight: 600 }}>◈ QumulusAI is thinking…</span>
        : <>
            <div style={{ fontSize: 9, fontWeight: 800, color: a, letterSpacing: "0.14em", marginBottom: 10 }}>✦ QUMULUSAI INTELLIGENCE</div>
            {response}
          </>
      }
    </div>
  );
}

function AIInput({ placeholder, onSubmit, loading, accent }) {
  const [val, setVal] = useState("");
  const a = accent || C.cyan;
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onSubmit(val); setVal(""); } }}
        placeholder={placeholder}
        style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.textDark, fontSize: 14, outline: "none", fontFamily: "inherit" }}
      />
      <button
        onClick={() => { if (val.trim()) { onSubmit(val); setVal(""); } }}
        disabled={loading || !val.trim()}
        style={{ background: a, color: "#fff", border: "none", borderRadius: 8, padding: "11px 22px", fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1, fontFamily: "inherit" }}
      >{loading ? "…" : "Generate"}</button>
    </div>
  );
}

function Chip({ label, onClick, accent }) {
  const a = accent || C.cyan;
  return (
    <button onClick={onClick} style={{ background: `${a}10`, border: `1px solid ${a}30`, borderRadius: 100, padding: "5px 13px", fontSize: 12, color: a, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
      {label}
    </button>
  );
}

function SectionHeader({ icon, title, subtitle, accent, tag }) {
  return (
    <div style={{ marginBottom: 26, paddingBottom: 22, borderBottom: `1px solid ${C.border}` }}>
      {tag && (
        <div style={{ display: "inline-block", background: `${accent||C.cyan}12`, border: `1px solid ${accent||C.cyan}30`, borderRadius: 100, padding: "3px 12px", fontSize: 9, fontWeight: 800, color: accent||C.cyan, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
          {tag}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
        <span style={{ color: accent || C.cyan, fontSize: 20 }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: C.textDark, letterSpacing: "-0.02em" }}>{title}</h2>
      </div>
      <p style={{ margin: 0, color: C.textMuted, fontSize: 13, lineHeight: 1.6 }}>{subtitle}</p>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({ setActive }) {
  const pillars = [
    { id: "recruit",   icon: "◈", title: "Recruiting Engine",  desc: "AI-powered intake, candidate matching, interview intelligence, and offer generation.", accent: C.violet },
    { id: "onboard",  icon: "◎", title: "Onboarding Concierge", desc: "Personalized onboarding journeys from offer accept through first 90 days.", accent: C.teal },
    { id: "manager",  icon: "◇", title: "Manager Coach",       desc: "AI leadership coaching, 1:1 prep, performance documentation, and team health.", accent: C.blue },
    { id: "employee", icon: "○", title: "Employee Hub",        desc: "Conversational AI for benefits, policies, payroll, and career development.", accent: C.blueLight },
    { id: "executive",icon: "◆", title: "Workforce Intel",     desc: "Predictive dashboards: attrition, headcount, labor cost, succession planning.", accent: C.amber },
  ];

  return (
    <div>
      <div style={{ textAlign: "center", padding: "52px 0 48px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `${C.cyan}15`, border: `1px solid ${C.cyan}40`, borderRadius: 100, padding: "5px 18px", marginBottom: 28, fontSize: 10, fontWeight: 800, color: C.cyan, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          ✦ AI-Native People Operating System
        </div>
        <h1 style={{ fontSize: "clamp(28px, 4.5vw, 48px)", fontWeight: 900, color: C.textDark, margin: "0 0 18px", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
          The intelligence layer<br />
          <span style={{ color: C.cyan }}>powering your people.</span>
        </h1>
        <p style={{ color: C.textMid, fontSize: 16, maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.75 }}>
          QumulusAI is scaling from 43 to 300+ people on the back of $500M in financing. This platform ensures every hire, onboarding, and people decision keeps pace with infrastructure velocity.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => setActive("recruit")} style={{ background: C.cyan, color: C.navy, border: "none", borderRadius: 8, padding: "13px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            See the Recruiting Engine →
          </button>
          <button onClick={() => setActive("executive")} style={{ background: "transparent", color: C.textMid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "13px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            View Workforce Intel
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {pillars.map(p => (
          <button key={p.id} onClick={() => setActive(p.id)}
            style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 11, padding: 22, textAlign: "left", cursor: "pointer", color: C.textDark, fontFamily: "inherit", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = p.accent; e.currentTarget.style.boxShadow = `0 4px 16px ${p.accent}18`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ fontSize: 22, color: p.accent, marginBottom: 12 }}>{p.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{p.title}</div>
            <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.65 }}>{p.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 48, padding: "24px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12 }}>
        <Label>Connects with your existing stack</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["Workday","BambooHR","Greenhouse","Ashby","Lever","LinkedIn Recruiter","ADP","Rippling","Slack","Microsoft Teams","SharePoint","Confluence","Notion","Power BI","Tableau","UKG"].map(t => (
            <span key={t} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: C.textMid }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RECRUITING ENGINE ────────────────────────────────────────────────────────
function RecruitingEngine() {
  const intake = useAI();
  const interview = useAI();
  const candidate = useAI();
  const [activeTab, setActiveTab] = useState("intake");

  const intakeSys = `You are QumulusAI's Recruiting Intelligence engine. Context: You are an AI People Operations assistant for QumulusAI — a vertically integrated AI infrastructure company based in Marietta, Georgia. QumulusAI provides bare-metal GPU cloud services and is scaling rapidly from 43 to 300+ employees after securing $500M in financing. CEO is Mike Maniscalco. The company's mission is to universalize access to AI compute. Roles are highly technical: GPU Infrastructure Engineers, AI Solutions Architects, Data Center Operations, Enterprise Sales. When given a hiring need or role description, generate a comprehensive, structured recruiting package. Format your response with clear sections using headers like:

JOB TITLE:
BUSINESS NEED:
CANDIDATE PROFILE:
KEY COMPETENCIES:
MUST-HAVE REQUIREMENTS:
NICE-TO-HAVE:
INTERVIEW GUIDE (3-4 questions per competency):
EVALUATION SCORECARD:
SUGGESTED COMPENSATION RANGE:
RECRUITING STRATEGY:

Be specific, practical, and tailored. This will be used by a recruiter immediately.`;

  const interviewSys = `You are QumulusAI's Interview Intelligence engine. When given interview notes or a transcript, produce a structured debrief. Use these sections:

CANDIDATE:
ROLE:
OVERALL RECOMMENDATION: (Strong Hire / Hire / No Hire / Strong No Hire)
EXECUTIVE SUMMARY (2-3 sentences):
COMPETENCY ASSESSMENT:
- [Competency]: [Rating 1-5] — [Evidence from interview]
KEY STRENGTHS:
RISKS & CONCERNS:
SUGGESTED FOLLOW-UP QUESTIONS:
COMPARATIVE NOTES (if multiple candidates mentioned):

Be direct. Hiring managers need clarity, not hedging.`;

  const candidateSys = `You are QumulusAI's Candidate Evaluation engine. When given candidate information (resume summary, background, interview notes), evaluate them against the role. Use:

CANDIDATE NAME:
ROLE APPLIED:
MATCH SCORE: [X/10]
EXECUTIVE RECOMMENDATION: (Advance / Hold / Pass)
MATCH SUMMARY (2 sentences):
STRENGTHS RELATIVE TO ROLE:
GAPS & RISKS:
CULTURE & TEAM FIT SIGNALS:
SUGGESTED INTERVIEW FOCUS AREAS:
COMPENSATION FIT:

Be specific. Avoid generic language.`;

  const tabs = [
    { id: "intake",    label: "Intake Intelligence",   icon: "◈" },
    { id: "candidate", label: "Candidate Evaluator",   icon: "◎" },
    { id: "interview", label: "Interview Intelligence", icon: "◇" },
  ];

  return (
    <div>
      <SectionHeader
        icon="◈" accent={C.violet}
        tag="Pillar One"
        title="AI Recruiting Engine"
        subtitle="From hiring need to accepted offer — one intelligent workflow. No admin. No gaps. No guesswork."
      />

      {/* Pipeline Overview */}
      <Card style={{ marginBottom: 16 }}>
        <Label color={C.violet}>Live Pipeline</Label>
        {OPEN_ROLES.map(r => (
          <div key={r.title} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.textDark }}>{r.title}</div>
              <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{r.dept} · {r.candidates} candidates · Day {r.days}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Badge label={r.stage} />
              <button
                onClick={() => { setActiveTab("intake"); intake.ask(intakeSys, `Generate a complete recruiting package for a ${r.title} role in the ${r.dept} department. This is day ${r.days} of the search with ${r.candidates} candidates in pipeline at the ${r.stage} stage.`); }}
                style={{ background: `${C.violet}15`, border: `1px solid ${C.violet}30`, borderRadius: 6, padding: "4px 11px", fontSize: 11, color: C.violet, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}
              >AI Generate ◈</button>
            </div>
          </div>
        ))}
      </Card>

      {/* AI Tools Tabs */}
      <Card>
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              background: activeTab === t.id ? `${C.violet}15` : "transparent",
              border: activeTab === t.id ? `1px solid ${C.violet}40` : `1px solid transparent`,
              borderRadius: 7, padding: "7px 14px", fontSize: 13,
              color: activeTab === t.id ? C.violet : C.textMuted,
              fontWeight: activeTab === t.id ? 700 : 400,
              cursor: "pointer", fontFamily: "inherit",
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {activeTab === "intake" && (
          <>
            <Label color={C.violet}>Hiring Manager Intake Intelligence</Label>
            <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.7, marginBottom: 4 }}>
              Describe the role or paste intake meeting notes. QumulusAI instantly generates a full recruiting package — job description, candidate profile, competency model, interview guide, and scorecard.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 4 }}>
              {[
                "VP of Engineering to lead our 40-person team through a platform rebuild",
                "Senior AI Product Manager to own our LLM product roadmap",
                "Head of People Ops as we scale from 200 to 500 employees",
              ].map(q => <Chip key={q} label={q} accent={C.violet} onClick={() => intake.ask(intakeSys, q)} />)}
            </div>
            <AIInput placeholder="Describe the role or paste intake notes…" onSubmit={q => intake.ask(intakeSys, q)} loading={intake.loading} accent={C.violet} />
            <AIBox loading={intake.loading} response={intake.response} accent={C.violet} />
          </>
        )}

        {activeTab === "candidate" && (
          <>
            <Label color={C.violet}>Candidate Evaluator</Label>
            <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.7, marginBottom: 4 }}>
              Paste a candidate's background, resume summary, or LinkedIn profile. QumulusAI scores them against the role and gives a clear advance/pass recommendation.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 4 }}>
              {[
                "Candidate: 8 yrs eng leadership at Stripe and Plaid, built teams of 60+, strong distributed systems background. Role: VP Engineering",
                "Candidate: 5 yrs PM at Google, 2 yrs at OpenAI on GPT-4 integrations, MBA Stanford. Role: Senior AI Product Manager",
                "Candidate: CHRO at 300-person SaaS for 4 yrs, previously recruiting at Workday, no AI-native company experience. Role: Head of People Ops",
              ].map(q => <Chip key={q} label={q.slice(0, 48) + "…"} accent={C.violet} onClick={() => candidate.ask(candidateSys, q)} />)}
            </div>
            <AIInput placeholder="Paste candidate background, resume summary, or LinkedIn…" onSubmit={q => candidate.ask(candidateSys, q)} loading={candidate.loading} accent={C.violet} />
            <AIBox loading={candidate.loading} response={candidate.response} accent={C.violet} />
          </>
        )}

        {activeTab === "interview" && (
          <>
            <Label color={C.violet}>Interview Intelligence</Label>
            <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.7, marginBottom: 4 }}>
              Paste interview notes or a transcript. QumulusAI produces a structured debrief with competency ratings, hire recommendation, risks, and suggested follow-ups.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 4 }}>
              {[
                "Interview with Sarah Chen for VP Eng. She described rebuilding Stripe's infra team from 15 to 55 people over 3 years. Struggled to answer questions about org design at scale. Strong on technical vision, weaker on people development.",
                "Interview with David Park for AI PM. Passionate, deep LLM knowledge, shipped 3 AI features at OpenAI. Seemed uncomfortable with enterprise sales cycles and customer discovery.",
              ].map(q => <Chip key={q} label={q.slice(0, 48) + "…"} accent={C.violet} onClick={() => interview.ask(interviewSys, q)} />)}
            </div>
            <AIInput placeholder="Paste interview notes or transcript…" onSubmit={q => interview.ask(interviewSys, q)} loading={interview.loading} accent={C.violet} />
            <AIBox loading={interview.loading} response={interview.response} accent={C.violet} />
          </>
        )}
      </Card>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function OnboardingConcierge() {
  const { ask, loading, response } = useAI();
  const sys = `You are QumulusAI's Onboarding Concierge. When given a new hire's details, generate a personalized onboarding plan. Include:

WELCOME MESSAGE (personalized):
30-DAY PRIORITIES:
60-DAY MILESTONES:
90-DAY SUCCESS CRITERIA:
WEEK 1 SCHEDULE:
KEY PEOPLE TO MEET:
REQUIRED TRAINING:
SYSTEMS ACCESS NEEDED:
MANAGER REMINDERS:
FIRST PROJECT RECOMMENDATION:

Make it specific, warm, and immediately actionable.`;

  const chips = [
    "New hire: Sarah Chen, VP Engineering, starting Monday, will manage 40 engineers across 4 teams, remote-first",
    "New hire: Marcus Webb, Enterprise AE, Chicago office, first SaaS role after 6 yrs at IBM",
    "New hire: Aiko Tanaka, Senior Data Scientist, PhD ML from MIT, first industry role",
  ];

  const milestones = [
    { day: "Day 1", title: "Welcome & Access", desc: "Systems provisioned, team intro, culture orientation", done: true },
    { day: "Week 1", title: "Role Immersion", desc: "Manager 1:1s, team meetings, key stakeholder intros", done: true },
    { day: "Day 30", title: "First Deliverable", desc: "Complete onboarding plan goals, 30-day check-in", done: false },
    { day: "Day 60", title: "Full Productivity", desc: "Independent contributions, peer feedback collected", done: false },
    { day: "Day 90", title: "Impact Review", desc: "90-day review, goal alignment for Q3", done: false },
  ];

  return (
    <div>
      <SectionHeader icon="◎" accent={C.teal} tag="Pillar Two" title="AI Onboarding Concierge" subtitle="Personalized onboarding journeys from offer accept through the first 90 days — automatically." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <Card>
          <Label color={C.teal}>Active Onboarding — Incoming CHRO</Label>
          <div style={{ marginBottom: 14 }}>
            {[["Role", "CHRO"], ["Start Date", "Jul 14, 2026"], ["Manager", "Mike Maniscalco, CEO"], ["Location", "Marietta, GA / Remote"]].map(([k,v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.textMuted }}>{k}</span>
                <span style={{ color: C.textDark, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ background: `${C.teal}10`, border: `1px solid ${C.teal}25`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 4 }}>AI INSIGHT</div>
            <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.6 }}>Sarah joins a team mid-sprint. Recommend delaying her first deliverable by 1 week to allow observation time. Manager briefed.</div>
          </div>
        </Card>
        <Card>
          <Label color={C.teal}>90-Day Milestone Tracker</Label>
          {milestones.map(m => (
            <div key={m.day} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: m.done ? C.teal : C.border, flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {m.done && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textDark }}>{m.day} — {m.title}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <Label color={C.teal}>Generate Personalized Onboarding Plan</Label>
        <p style={{ color: C.textMid, fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>Describe a new hire and QumulusAI builds their complete 90-day onboarding journey instantly.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 4 }}>
          {chips.map(q => <Chip key={q} label={q.slice(0, 46) + "…"} accent={C.teal} onClick={() => ask(sys, q)} />)}
        </div>
        <AIInput placeholder="Describe the new hire — role, team, location, background…" onSubmit={q => ask(sys, q)} loading={loading} accent={C.teal} />
        <AIBox loading={loading} response={response} accent={C.teal} />
      </Card>
    </div>
  );
}

// ─── MANAGER COACH ────────────────────────────────────────────────────────────
function ManagerCoach() {
  const { ask, loading, response } = useAI();
  const sys = "You are an AI People Operations assistant for QumulusAI — a vertically integrated AI infrastructure company based in Marietta, Georgia. QumulusAI provides bare-metal GPU cloud services and is scaling rapidly from 43 to 300+ employees after securing $500M in financing. CEO is Mike Maniscalco. The company's mission is to universalize access to AI compute. Roles are highly technical: GPU Infrastructure Engineers, AI Solutions Architects, Data Center Operations, Enterprise Sales. You are their AI Manager Coach. Give specific, actionable leadership advice. Be empathetic but direct. Under 200 words.";
  const chips = ["Help me prepare for Sofia's performance review — she's underperforming but has high potential", "Draft a PIP for an engineer who's been missing deadlines", "One of my senior reports told me they're thinking of leaving", "How do I give feedback on communication style without it feeling personal?"];

  return (
    <div>
      <SectionHeader icon="◇" accent={C.blue} tag="Pillar Three" title="AI Manager Coach" subtitle="Your AI leadership partner — preparation, coaching, documentation, and team intelligence." />

      <Card style={{ marginBottom: 14 }}>
        <Label color={C.blue}>Team Health — Direct Reports</Label>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>{["Name","Role","Tenure","Sentiment","Flight Risk","Action"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: C.textMuted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {EMPLOYEES.map(e => (
                <tr key={e.name} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px", color: C.textDark, fontWeight: 600 }}>{e.name}</td>
                  <td style={{ padding: "10px", color: C.textMid }}>{e.role}</td>
                  <td style={{ padding: "10px", color: C.textMuted }}>{e.tenure}</td>
                  <td style={{ padding: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 5, background: C.border, borderRadius: 3 }}>
                        <div style={{ width: `${e.sentiment}%`, height: "100%", borderRadius: 3, background: e.sentiment > 70 ? C.emerald : e.sentiment > 50 ? C.amber : C.rose }} />
                      </div>
                      <span style={{ color: C.textDark, fontSize: 12 }}>{e.sentiment}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px" }}><Badge label={e.risk} /></td>
                  <td style={{ padding: "10px" }}>
                    <button onClick={() => ask(sys, `My direct report ${e.name} (${e.role}, ${e.tenure} tenure) has a sentiment score of ${e.sentiment}/100 and is a ${e.risk} flight risk. Give me specific actions to take this week.`)}
                      style={{ background: `${C.blue}12`, border: `1px solid ${C.blue}30`, borderRadius: 5, padding: "4px 10px", fontSize: 11, color: C.blue, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                      Coach me
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AIBox loading={loading} response={response} accent={C.blue} />
      </Card>

      <Card>
        <Label color={C.blue}>Ask Your Coach</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 4 }}>
          {chips.map(q => <Chip key={q} label={q.slice(0, 50) + "…"} accent={C.blue} onClick={() => ask(sys, q)} />)}
        </div>
        <AIInput placeholder="Ask about feedback, performance, difficult conversations…" onSubmit={q => ask(sys, q)} loading={loading} accent={C.blue} />
      </Card>
    </div>
  );
}

// ─── EMPLOYEE HUB ─────────────────────────────────────────────────────────────
function EmployeeHub() {
  const { ask, loading, response } = useAI();
  const sys = "You are an AI People Operations assistant for QumulusAI — a vertically integrated AI infrastructure company based in Marietta, Georgia. QumulusAI provides bare-metal GPU cloud services and is scaling rapidly from 43 to 300+ employees after securing $500M in financing. CEO is Mike Maniscalco. The company's mission is to universalize access to AI compute. Roles are highly technical: GPU Infrastructure Engineers, AI Solutions Architects, Data Center Operations, Enterprise Sales. Answer employee HR questions clearly in under 150 words. Be warm, specific, and actionable.";
  const chips = ["What's my PTO balance and how do I request time off?", "Explain our parental leave policy", "How do I update my 401k contribution?", "What internal roles are open that match my background?"];

  return (
    <div>
      <SectionHeader icon="○" accent={C.blueLight} tag="Pillar Four" title="Employee Support Hub" subtitle="Instant answers to any HR question — benefits, payroll, policies, career development, and more." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <Card>
          <Label color={C.blueLight}>Your Snapshot</Label>
          {[["PTO Balance","12 days"],["Next Pay Date","Jul 1, 2026"],["Benefits Tier","Core Plus"],["Manager","Mike Maniscalco, CEO"],["Location","Atlanta, GA (HQ)"]].map(([k,v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span style={{ color: C.textMuted }}>{k}</span>
              <span style={{ color: C.textDark, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </Card>
        <Card>
          <Label color={C.blueLight}>Quick Actions</Label>
          {["Request PTO","Update Direct Deposit","View Pay Stubs","Submit Expense Report","Find Internal Roles"].map(a => (
            <button key={a} style={{ display: "block", width: "100%", textAlign: "left", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 12px", marginBottom: 7, color: C.textDark, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              {a} →
            </button>
          ))}
        </Card>
      </div>

      <Card>
        <Label color={C.blueLight}>Ask HR Anything</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 4 }}>
          {chips.map(q => <Chip key={q} label={q} accent={C.blueLight} onClick={() => ask(sys, q)} />)}
        </div>
        <AIInput placeholder="Ask about PTO, benefits, payroll, career, policies…" onSubmit={q => ask(sys, q)} loading={loading} accent={C.blueLight} />
        <AIBox loading={loading} response={response} accent={C.blueLight} />
      </Card>
    </div>
  );
}

// ─── WORKFORCE INTEL ──────────────────────────────────────────────────────────
function WorkforceIntel() {
  const { ask, loading, response } = useAI();
  const sys = "You are an AI People Operations assistant for QumulusAI — a vertically integrated AI infrastructure company based in Marietta, Georgia. QumulusAI provides bare-metal GPU cloud services and is scaling rapidly from 43 to 300+ employees after securing $500M in financing. CEO is Mike Maniscalco. The company's mission is to universalize access to AI compute. Roles are highly technical: GPU Infrastructure Engineers, AI Solutions Architects, Data Center Operations, Enterprise Sales. You are their Workforce Intelligence engine advising the CEO and incoming CHRO. Provide strategic, data-driven insights. Be direct and predictive. Under 200 words.";
  const chips = ["Our Sales attrition is 29% — what's the strategic risk and what do we do?", "Should we hire or upskill for AI roles given our current team?", "Forecast headcount and labor cost for scaling to 600 employees", "Build a succession plan framework for our VP-level roles"];

  return (
    <div>
      <SectionHeader icon="◆" accent={C.amber} tag="Pillar Five" title="Workforce Intelligence" subtitle="Predictive dashboards, attrition signals, headcount planning, and AI-generated executive recommendations." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
        {METRICS.map(m => (
          <Card key={m.label} style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.textDark, letterSpacing: "-0.02em" }}>{m.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: m.trend === "up" ? C.emerald : C.rose }}>{m.trend === "up" ? "↑" : "↓"} {m.delta}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom: 14 }}>
        <Label color={C.amber}>Attrition Risk by Department</Label>
        {[
          { dept: "Infrastructure",  risk: 18, headcount: 14 },
          { dept: "Sales",           risk: 31, headcount: 8  },
          { dept: "Solutions Eng",   risk: 12, headcount: 7  },
          { dept: "DC Operations",   risk: 24, headcount: 6  },
          { dept: "G&A / Finance",   risk: 8,  headcount: 8  },
        ].map(d => (
          <div key={d.dept} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ width: 130, fontSize: 13, color: C.textMid }}>{d.dept}</div>
            <div style={{ flex: 1, height: 7, background: C.border, borderRadius: 4 }}>
              <div style={{ width: `${Math.min(d.risk * 2.8, 100)}%`, height: "100%", borderRadius: 4, background: d.risk > 25 ? C.rose : d.risk > 15 ? C.amber : C.emerald }} />
            </div>
            <div style={{ width: 36, fontSize: 13, color: C.textDark, fontWeight: 700, textAlign: "right" }}>{d.risk}%</div>
            <div style={{ width: 48, fontSize: 11, color: C.textMuted, textAlign: "right" }}>{d.headcount} hc</div>
          </div>
        ))}
      </Card>

      <Card>
        <Label color={C.amber}>Strategic Intelligence</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 4 }}>
          {chips.map(q => <Chip key={q} label={q.slice(0, 50) + "…"} accent={C.amber} onClick={() => ask(sys, q)} />)}
        </div>
        <AIInput placeholder="Ask about workforce planning, attrition, succession, org health…" onSubmit={q => ask(sys, q)} loading={loading} accent={C.amber} />
        <AIBox loading={loading} response={response} accent={C.amber} />
      </Card>
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
export default function App() {
 const [active, setActive] = useState("home");
 const [session, setSession] = useState(null);
 const [loading, setLoading] = useState(true);
const [userRole, setUserRole] = useState(null); 
  useEffect(() => {
   supabase.auth.getSession().then(({ data: { session } }) => {
     setSession(session);
     setLoading(false);
   });
   const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
     setSession(session);
   });
   return () => subscription.unsubscribe();
 }, []); 
  useEffect(() => {

  if (session) {

    supabase.from("profiles").select("role").eq("id", session.user.id).single()

      .then(({ data }) => setUserRole(data?.role || "recruiter"));

  }

}, [session]);
 if (loading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0F", color: "#E8E8F0" }}>Loading…</div>;
if (!session) return <Auth onAuth={() => supabase.auth.getSession()} />;
const params = new URLSearchParams(window.location.search);
const signingToken = params.get("sign");
if (signingToken) return <OfferSigning token={signingToken} />;
const onboardToken = params.get("onboard");
if (onboardToken) return <NewHirePortal token={onboardToken} />;



if (session && userRole === "employee") return <EmployeePortal user={session.user} />;
 

  const screens = {
    home:      <CommandCenter greeting={userRole === "ceo" || userRole === "executive" ? "Good day, Executive. Here's your workforce at a glance." : undefined} />,
    recruit:   <RecruitingEngine />,
    onboard:   <OnboardingConcierge />,
    manager:   <ManagerCoach />,
    employee:  <EmployeeHub />,
    executive: <WorkforceIntel />,careers: <CareersPortal />, inbox: <TalentInbox />, messenger: <Messenger />,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Inter', -apple-system, sans-serif", background: C.bg }}>

      {/* Sidebar */}
      <aside style={{ width: 224, background: C.bgSidebar, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        {/* Logo */}
        <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${C.borderDark}` }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: C.textOnDark, letterSpacing: "-0.02em" }}>
            <span style={{ color: C.cyan }}>Q</span>umulus<span style={{ color: C.cyan }}>AI</span>
          </div>
          <div style={{ fontSize: 9, color: C.textMutedDark, marginTop: 3, letterSpacing: "0.1em", textTransform: "uppercase" }}>People Operating System</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActive(n.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 7, marginBottom: 2, background: active === n.id ? C.bgActive : "transparent", border: "none", color: active === n.id ? C.textOnDark : C.textMutedDark, fontSize: 13, fontWeight: active === n.id ? 600 : 400, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.1s" }}
              onMouseEnter={e => { if (active !== n.id) { e.currentTarget.style.background = C.bgSidebarHov; e.currentTarget.style.color = C.textOnDark; } }}
              onMouseLeave={e => { if (active !== n.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textMutedDark; } }}
            >
              <span style={{ fontSize: 13, color: active === n.id ? n.accent : "inherit" }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
<button onClick={() => supabase.auth.signOut()} style={{ width: "100%", background: "transparent", border: `1px solid ${C.borderDark}`, borderRadius: 6, padding: "7px 0", color: C.textMutedDark, fontSize: 12, cursor: "pointer", marginBottom: 8, fontFamily: "inherit" }}>
 Sign Out
</button>
        {/* Demo badge */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.borderDark}` }}>
          <div style={{ background: `${C.cyan}15`, border: `1px solid ${C.cyan}30`, borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: C.cyan, letterSpacing: "0.1em", marginBottom: 2 }}>LIVE DEMO</div>
            <div style={{ fontSize: 10, color: C.textMutedDark, lineHeight: 1.5 }}>All AI responses are live. Powered by Claude.</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", padding: "36px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {screens[active]}
        </div>
      </main>
    </div>
  );
}
