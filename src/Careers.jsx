import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
 import.meta.env.VITE_SUPABASE_URL,
 import.meta.env.VITE_SUPABASE_ANON_KEY
);

const C = {
  bg:        "#080D1A",
  bgCard:    "#0F1828",
  bgCardHov: "#141F2E",
  border:    "#1A2A3A",
  cyan:      "#00C2E0",
  cyanDark:  "#0099B8",
  navy:      "#0A2540",
  text:      "#E8EEF8",
  textMid:   "#8AA0B8",
  textMuted: "#4A6080",
  emerald:   "#059669",
  amber:     "#D97706",
  rose:      "#DC2626",
  violet:    "#7C3AED",
};

const ROLES = [
  {
    id: 1,
    title: "Chief Human Resources Officer",
    dept: "People & Culture",
    location: "Atlanta, GA / Remote",
    type: "Full-Time",
    level: "Executive",
    summary: "Build and lead the People function from the ground up at one of the fastest-growing AI infrastructure companies in the country. You will be QumulusAI's first CHRO, creating the systems, culture, and talent strategy that will take us from 43 to 300+ employees.",
    requirements: ["15+ years HR leadership experience", "Experience scaling a company through hyper-growth", "Strong background in technical recruiting", "Compensation and total rewards expertise", "AI-native mindset"],
    nice: ["Experience at an AI or infrastructure company", "CHRO or VP People title at a funded startup"],
    comp: "$250,000 – $320,000 + equity",
  },
  {
    id: 2,
    title: "Senior GPU Infrastructure Engineer",
    dept: "Infrastructure",
    location: "Atlanta, GA / Remote",
    type: "Full-Time",
    level: "Senior",
    summary: "Design, build, and operate the GPU compute infrastructure that powers AI workloads for our enterprise customers. You'll work with bare-metal NVIDIA clusters, high-speed networking, and cutting-edge storage systems at massive scale.",
    requirements: ["5+ years infrastructure engineering", "Hands-on experience with GPU clusters (NVIDIA H100/A100)", "Deep networking knowledge (InfiniBand, RoCE)", "Linux systems administration", "Experience with Kubernetes at scale"],
    nice: ["Experience at a GPU cloud provider", "CUDA or GPU programming knowledge"],
    comp: "$160,000 – $220,000 + equity",
  },
  {
    id: 3,
    title: "Director of Enterprise Sales",
    dept: "Sales",
    location: "Remote – US",
    type: "Full-Time",
    level: "Director",
    summary: "Own and grow QumulusAI's enterprise revenue. You'll sell GPU cloud infrastructure and AI compute solutions to ML teams, AI startups, research institutions, and enterprises training large models.",
    requirements: ["8+ years enterprise sales experience", "Track record closing $500K+ deals", "Experience selling infrastructure or cloud services", "Strong technical aptitude", "Experience building and managing a sales team"],
    nice: ["Existing relationships at AI-native companies", "Experience selling GPU or HPC solutions"],
    comp: "$140,000 – $180,000 base + uncapped commission + equity",
  },
  {
    id: 4,
    title: "AI Solutions Engineer – EMEA",
    dept: "Solutions Engineering",
    location: "Remote – Europe",
    type: "Full-Time",
    level: "Senior",
    summary: "Be QumulusAI's technical face to enterprise customers across Europe, Middle East, and Africa. You'll help AI teams architect their compute strategy, onboard to our platform, and scale their workloads on our GPU infrastructure.",
    requirements: ["5+ years solutions engineering or technical sales", "Deep understanding of AI/ML infrastructure", "Experience with Python, Docker, Kubernetes", "Excellent communication skills", "Based in EMEA timezone"],
    nice: ["Experience with LLM training or inference infrastructure", "Prior experience at a GPU cloud provider"],
    comp: "€120,000 – €160,000 + equity",
  },
  {
    id: 5,
    title: "Data Center Operations Manager",
    dept: "DC Operations",
    location: "Atlanta, GA",
    type: "Full-Time",
    level: "Manager",
    summary: "Oversee day-to-day operations of QumulusAI's GPU data center infrastructure. You'll manage a team responsible for physical infrastructure, power systems, cooling, hardware deployment, and operational excellence across our facilities.",
    requirements: ["5+ years data center operations experience", "Experience managing physical GPU or HPC infrastructure", "Knowledge of power and cooling systems", "Strong leadership and team management skills", "Familiarity with DCIM tools"],
    nice: ["Experience with colocation data centers", "Background in GPU or AI compute infrastructure"],
    comp: "$110,000 – $145,000 + equity",
  },
  {
    id: 6,
    title: "Head of Marketing",
    dept: "Marketing",
    location: "Remote – US",
    type: "Full-Time",
    level: "Head of",
    summary: "Own QumulusAI's brand, demand generation, and go-to-market strategy. You'll build our marketing function from scratch, establishing QumulusAI as the leading independent AI infrastructure company.",
    requirements: ["8+ years B2B marketing experience", "Experience marketing infrastructure, cloud, or developer tools", "Strong demand generation background", "Excellent content and brand storytelling skills", "Data-driven approach to marketing"],
    nice: ["Experience at an AI or GPU infrastructure company", "Technical background or deep understanding of AI compute"],
    comp: "$150,000 – $190,000 + equity",
  },
];

const STEPS = ["Browse Roles", "Apply", "AI Screening", "Confirmation"];

function useAI() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  const ask = async (system, user) => {
    setLoading(true);
    setResponse("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "proxy",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      const data = await res.json();
      setResponse(data.content?.map(b => b.text || "").join("") || "");
    } catch { setResponse(""); }
    setLoading(false);
  };

  return { ask, loading, response };
}

function Badge({ label, color }) {
  return (
    <span style={{ background: `${color}18`, color, borderRadius: 5, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
      {label}
    </span>
  );
}

function RoleCard({ role, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={() => onClick(role)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.bgCardHov : C.bgCard, border: `1px solid ${hov ? C.cyan + "60" : C.border}`, borderRadius: 12, padding: 22, cursor: "pointer", transition: "all 0.15s", boxShadow: hov ? `0 4px 24px ${C.cyan}12` : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 6 }}>{role.title}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge label={role.dept} color={C.cyan} />
            <Badge label={role.location} color={C.textMid} />
            <Badge label={role.level} color={C.violet} />
          </div>
        </div>
        <div style={{ color: C.cyan, fontSize: 20, marginLeft: 12 }}>→</div>
      </div>
      <div style={{ color: C.textMid, fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>{role.summary.slice(0, 120)}…</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: C.cyan, fontSize: 13, fontWeight: 700 }}>{role.comp}</span>
        <span style={{ color: C.textMuted, fontSize: 11 }}>{role.type}</span>
      </div>
    </div>
  );
}

function ApplicationForm({ role, onBack, onSubmit }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", location: "", linkedin: "", experience: "", why: "", resume: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = { width: "100%", background: "#0A1520", border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
  const labelStyle = { fontSize: 12, color: C.textMid, fontWeight: 600, marginBottom: 6, display: "block" };

  return (
    <div>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.textMid, cursor: "pointer", fontSize: 13, marginBottom: 20, fontFamily: "inherit" }}>← Back to roles</button>
      <div style={{ background: `${C.cyan}10`, border: `1px solid ${C.cyan}25`, borderRadius: 10, padding: 18, marginBottom: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: C.text, marginBottom: 4 }}>{role.title}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge label={role.dept} color={C.cyan} />
          <Badge label={role.location} color={C.textMid} />
          <Badge label={role.comp} color={C.emerald} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label style={labelStyle}>Full Name *</label><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Jane Smith" style={inputStyle} /></div>
        <div><label style={labelStyle}>Email Address *</label><input value={form.email} onChange={e => set("email", e.target.value)} placeholder="jane@example.com" style={inputStyle} /></div>
        <div><label style={labelStyle}>Phone Number</label><input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 (555) 000-0000" style={inputStyle} /></div>
        <div><label style={labelStyle}>Current Location</label><input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Atlanta, GA" style={inputStyle} /></div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>LinkedIn Profile URL</label>
        <input value={form.linkedin} onChange={e => set("linkedin", e.target.value)} placeholder="linkedin.com/in/yourname" style={inputStyle} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Years of Relevant Experience *</label>
        <select value={form.experience} onChange={e => set("experience", e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
          <option value="">Select…</option>
          <option>1–3 years</option><option>4–6 years</option><option>7–10 years</option><option>10–15 years</option><option>15+ years</option>
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Why QumulusAI? What excites you about this role? *</label>
        <textarea value={form.why} onChange={e => set("why", e.target.value)} rows={4} placeholder="Tell us what draws you to QumulusAI and why you're the right person for this role…"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Resume / Experience Summary *</label>
        <textarea value={form.resume} onChange={e => set("resume", e.target.value)} rows={6}
          placeholder="Paste your resume text or key experience highlights here. Our AI will use this to evaluate your application instantly…"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
      </div>

      <button
        onClick={() => { if (form.name && form.email && form.why && form.resume) onSubmit(form); }}
        disabled={!form.name || !form.email || !form.why || !form.resume}
        style={{ width: "100%", background: (!form.name || !form.email || !form.why || !form.resume) ? C.border : C.cyan, color: (!form.name || !form.email || !form.why || !form.resume) ? C.textMuted : C.navy, border: "none", borderRadius: 10, padding: "16px", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
        Submit Application — AI Screening Begins Instantly
      </button>
    </div>
  );
}

function AIScreeningResult({ role, form, aiResponse, loading }) {
  const lines = aiResponse.split("\n").filter(Boolean);
  const scoreMatch = aiResponse.match(/(\d{1,3})\s*\/\s*100|SCORE[:\s]+(\d{1,3})|(\d{1,3})\s*out of\s*100/i);
  const score = scoreMatch ? parseInt(scoreMatch[1] || scoreMatch[2] || scoreMatch[3]) : null;
  const decision = aiResponse.match(/STRONG HIRE|HIRE|ADVANCE|HOLD|PASS|NO HIRE/i)?.[0]?.toUpperCase();
  const decColor = decision?.includes("HIRE") || decision === "ADVANCE" || decision === "STRONG HIRE" ? C.emerald : decision === "HOLD" ? C.amber : C.rose;

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${C.cyan}20`, border: `2px solid ${C.cyan}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24 }}>
        {loading ? "◈" : "✦"}
      </div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 8 }}>
        {loading ? "AI is reviewing your application…" : "Application Received!"}
      </h2>
      <p style={{ color: C.textMid, fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
        {loading ? "Our AI is evaluating your background against the role requirements. This takes about 10 seconds." : `Thank you ${form.name}. Here's your instant AI screening result for the ${role.title} role.`}
      </p>

      {loading && (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
          {["Analyzing experience and background…", "Matching skills to role requirements…", "Evaluating culture and mission alignment…", "Generating screening recommendation…"].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", color: C.textMid, fontSize: 13 }}>
              <span style={{ color: C.cyan }}>◈</span>{s}
            </div>
          ))}
        </div>
      )}

      {!loading && aiResponse && (
        <div>
          {score && (
            <div style={{ display: "flex", gap: 14, marginBottom: 20, justifyContent: "center" }}>
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 28px", textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: score >= 80 ? C.emerald : score >= 60 ? C.amber : C.rose }}>{score}</div>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em" }}>Match Score / 100</div>
              </div>
              {decision && (
                <div style={{ background: `${decColor}15`, border: `1px solid ${decColor}40`, borderRadius: 10, padding: "16px 28px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: decColor }}>{decision}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em", marginTop: 4 }}>AI Decision</div>
                </div>
              )}
            </div>
          )}
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.cyan}`, borderRadius: 10, padding: 20, textAlign: "left", marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: C.cyan, letterSpacing: "0.14em", marginBottom: 12 }}>✦ YOUR AI SCREENING RESULT</div>
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{aiResponse}</div>
          </div>
          <div style={{ background: `${C.emerald}10`, border: `1px solid ${C.emerald}25`, borderRadius: 10, padding: 16, textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.emerald, marginBottom: 6 }}>✓ What happens next</div>
            <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7 }}>Your application has been received and scored. A member of the QumulusAI recruiting team will review your result and reach out within 2–3 business days if your background is a strong match for this role.</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CareersPortal() {
  const [step, setStep] = useState(0); // 0=browse, 1=role detail, 2=apply, 3=screening
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState("All");
  const { ask, loading, response } = useAI();

  const depts = ["All", ...new Set(ROLES.map(r => r.dept))];
  const filtered = filter === "All" ? ROLES : ROLES.filter(r => r.dept === filter);

  const handleApply = async (formData) => {
    setForm(formData);
    setStep(3); supabase.from("applications").insert([{
 full_name: formData.name,
 email: formData.email,
 phone: formData.phone,
 linkedin_url: formData.linkedin,
 role_title: selectedRole.title,
 department: selectedRole.dept,
 cover_letter: formData.why,
 status: "new",
}]);
    await ask(
      `You are QumulusAI's AI recruiting screener. QumulusAI is a 43-person bare-metal GPU cloud company in Atlanta, GA with $500M in financing, scaling to 300+ employees. CEO: Mike Maniscalco. Mission: universalize access to AI compute.

Screen this candidate and respond with:
MATCH SCORE: [X/100]
DECISION: [ADVANCE / HOLD / PASS]
SUMMARY: (2 sentences on overall fit)
STRENGTHS:
- (bullet)
- (bullet)
GAPS:
- (bullet)
WHAT EXCITES US: (1 sentence on what's compelling)
NEXT STEP: (what happens next for this candidate)

Be honest but encouraging. This response is shown directly to the candidate.`,
      `Role: ${selectedRole.title} (${selectedRole.dept})
Requirements: ${selectedRole.requirements.join(", ")}

Candidate: ${formData.name}
Location: ${formData.location}
Experience: ${formData.experience}
LinkedIn: ${formData.linkedin}

Why QumulusAI: ${formData.why}

Resume/Background: ${formData.resume}`
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', -apple-system, sans-serif", color: C.text }}>

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: "0 40px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: C.bg, zIndex: 100 }}>
        <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.02em" }}>
          <span style={{ color: C.cyan }}>Q</span>umulus<span style={{ color: C.cyan }}>AI</span>
          <span style={{ color: C.textMuted, fontWeight: 400, fontSize: 13, marginLeft: 12 }}>Careers</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ color: C.textMid, fontSize: 13 }}>{ROLES.length} open roles</span>
          {step > 0 && (
            <button onClick={() => { setStep(0); setSelectedRole(null); }}
              style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 14px", color: C.textMid, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              ← All Roles
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>

        {/* BROWSE */}
        {step === 0 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ display: "inline-block", background: `${C.cyan}15`, border: `1px solid ${C.cyan}30`, borderRadius: 100, padding: "5px 16px", fontSize: 10, fontWeight: 800, color: C.cyan, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 20 }}>
                ✦ We're Hiring
              </div>
              <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900, color: C.text, margin: "0 0 16px", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                Build the future of<br /><span style={{ color: C.cyan }}>AI infrastructure.</span>
              </h1>
              <p style={{ color: C.textMid, fontSize: 16, maxWidth: 480, margin: "0 auto", lineHeight: 1.75 }}>
                QumulusAI is scaling from 43 to 300+ people. Join us and help universalize access to AI compute.
              </p>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {depts.map(d => (
                <button key={d} onClick={() => setFilter(d)} style={{
                  background: filter === d ? C.cyan : "transparent",
                  color: filter === d ? C.navy : C.textMid,
                  border: `1px solid ${filter === d ? C.cyan : C.border}`,
                  borderRadius: 100, padding: "6px 14px", fontSize: 13,
                  fontWeight: filter === d ? 700 : 400, cursor: "pointer", fontFamily: "inherit",
                }}>{d}</button>
              ))}
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {filtered.map(r => <RoleCard key={r.id} role={r} onClick={r => { setSelectedRole(r); setStep(1); }} />)}
            </div>

            <div style={{ textAlign: "center", marginTop: 48, padding: "32px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 8 }}>Don't see your role?</div>
              <p style={{ color: C.textMid, fontSize: 14, marginBottom: 16 }}>We're growing fast. Send us your background and we'll reach out when the right role opens.</p>
              <button onClick={() => { setSelectedRole({ id: 0, title: "General Application", dept: "QumulusAI", location: "Remote / Atlanta, GA", type: "Full-Time", level: "Open", comp: "Competitive + equity", summary: "Tell us who you are and what you're great at.", requirements: [], nice: [] }); setStep(2); }}
                style={{ background: "transparent", border: `1px solid ${C.cyan}`, borderRadius: 8, padding: "11px 24px", color: C.cyan, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Submit General Application
              </button>
            </div>
          </div>
        )}

        {/* ROLE DETAIL */}
        {step === 1 && selectedRole && (
          <div>
            <button onClick={() => setStep(0)} style={{ background: "transparent", border: "none", color: C.textMid, cursor: "pointer", fontSize: 13, marginBottom: 24, fontFamily: "inherit" }}>← All Roles</button>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 12, letterSpacing: "-0.02em" }}>{selectedRole.title}</h1>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <Badge label={selectedRole.dept} color={C.cyan} />
                <Badge label={selectedRole.location} color={C.textMid} />
                <Badge label={selectedRole.level} color={C.violet} />
                <Badge label={selectedRole.type} color={C.textMuted} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.cyan, marginBottom: 20 }}>{selectedRole.comp}</div>
            </div>

            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>About the Role</div>
              <p style={{ color: C.textMid, fontSize: 15, lineHeight: 1.8, margin: 0 }}>{selectedRole.summary}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Requirements</div>
                {selectedRole.requirements.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", fontSize: 13, color: C.textMid, borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.cyan }}>✓</span>{r}
                  </div>
                ))}
              </div>
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Nice to Have</div>
                {selectedRole.nice.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", fontSize: 13, color: C.textMid, borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.violet }}>◈</span>{r}
                  </div>
                ))}
                <div style={{ marginTop: 16, background: `${C.cyan}10`, border: `1px solid ${C.cyan}25`, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: C.cyan, fontWeight: 700, marginBottom: 4 }}>✦ AI-Powered Screening</div>
                  <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.6 }}>Apply and get instant AI feedback on your fit for this role. No waiting weeks to hear back.</div>
                </div>
              </div>
            </div>

            <button onClick={() => setStep(2)} style={{ width: "100%", background: C.cyan, color: C.navy, border: "none", borderRadius: 10, padding: "16px", fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>
              Apply Now — Get Instant AI Feedback
            </button>
          </div>
        )}

        {/* APPLICATION FORM */}
        {step === 2 && selectedRole && (
          <ApplicationForm role={selectedRole} onBack={() => setStep(1)} onSubmit={handleApply} />
        )}

        {/* AI SCREENING RESULT */}
        {step === 3 && selectedRole && (
          <AIScreeningResult role={selectedRole} form={form} aiResponse={response} loading={loading} />
        )}
      </main>

      <footer style={{ borderTop: `1px solid ${C.border}`, padding: "24px 40px", textAlign: "center", color: C.textMuted, fontSize: 12, marginTop: 60 }}>
        © 2026 QumulusAI · Marietta, GA · Universalizing access to AI compute
      </footer>
    </div>
  );
}
