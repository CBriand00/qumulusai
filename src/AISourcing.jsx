import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const C = {
  bg: "#F7F8FA", surface: "#FFFFFF", border: "#E5E7EB",
  text: "#0F172A", muted: "#64748B", violet: "#7C3AED", blue: "#2563EB",
  emerald: "#059669", amber: "#D97706",
};

function renderMd(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    const t = line.trim();
    const bold = (s) => s.split(/(\*\*[^*]+\*\*)/).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
    );
    if (t.startsWith("### ")) return <h3 key={i} style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 4px", color: C.text }}>{t.slice(4)}</h3>;
    if (t.startsWith("## "))  return <h2 key={i} style={{ fontSize: 17, fontWeight: 700, margin: "20px 0 6px", color: C.text }}>{t.slice(3)}</h2>;
    if (t.startsWith("# "))   return <h1 key={i} style={{ fontSize: 19, fontWeight: 700, margin: "20px 0 8px", color: C.text }}>{t.slice(2)}</h1>;
    if (t === "---") return <hr key={i} style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "12px 0" }} />;
    if (t === "") return <div key={i} style={{ height: 6 }} />;
    return <p key={i} style={{ margin: "2px 0", fontSize: 14, lineHeight: 1.75, color: "#334155" }}>{bold(t)}</p>;
  });
}

export default function AISourcing() {
  const [roleDesc, setRoleDesc]   = useState("");
  const [location, setLocation]   = useState("Atlanta, GA");
  const [skills, setSkills]       = useState("");
  const [aiResult, setAiResult]   = useState("");
  const [generating, setGenerating] = useState(false);

  // PDL candidate sourcing
  const [sourcing, setSourcing]   = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [sourcingError, setSourcingError] = useState("");
  const [addedIds, setAddedIds]   = useState(new Set());

  // Passive radar
  const [openRoles, setOpenRoles] = useState([]);

  useEffect(() => {
    supabase.from("applications")
      .select("role_title, status")
      .then(({ data }) => {
        if (!data) return;
        const counts = {};
        data.forEach(a => { counts[a.role_title] = (counts[a.role_title] || 0) + 1; });
        setOpenRoles(Object.entries(counts).map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count));
      });
  }, []);

  async function handleGenerate() {
    if (!roleDesc.trim()) return;
    setGenerating(true);
    setAiResult("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-query", {
        body: {
          max_tokens: 1500,
          system: `You are QumulusAI's AI Talent Sourcing engine. When given a role description, generate:
1. IDEAL CANDIDATE PROFILE: skills, experience, background
2. WHERE TO FIND THEM: specific communities, companies, schools, events
3. BOOLEAN SEARCH STRINGS: for LinkedIn Recruiter
4. OUTREACH MESSAGE: personalized cold outreach template
5. SCREENING QUESTIONS: 5 questions to qualify candidates
6. COMPENSATION BENCHMARK: market rate for this role in Atlanta/remote
Be specific and actionable.`,
          messages: [{ role: "user", content: `Role: ${roleDesc}\nLocation: ${location || "Atlanta, GA / Remote"}\nKey Skills: ${skills || "Not specified"}` }],
        },
      });
      if (error) throw error;
      setAiResult(data?.content?.[0]?.text || "");
    } catch (e) {
      setAiResult("Error: " + e.message);
    }
    setGenerating(false);
  }

  async function handleSourceCandidates() {
    if (!roleDesc.trim()) return;
    setSourcing(true);
    setCandidates([]);
    setSourcingError("");
    try {
      const { data, error } = await supabase.functions.invoke("source-candidates", {
        body: { role_title: roleDesc, location: location || "Atlanta", skills },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // PDL returns raw response: { data: [...people], total, status }
      const people = data?.data || [];
      const mapped = people.map(p => ({
        name: p.full_name,
        title: p.job_title,
        company: p.job_company_name,
        location: p.location_locality ? `${p.location_locality}${p.location_region ? ", " + p.location_region : ""}` : null,
        linkedin_url: p.linkedin_url,
        email: p.emails?.[0]?.address || null,
      }));
      setCandidates(mapped);
      if (mapped.length === 0) setSourcingError("No candidates found. Try a broader title or location.");
    } catch (e) {
      setSourcingError("Sourcing unavailable: " + e.message);
    }
    setSourcing(false);
  }

  async function addToPipeline(c) {
    const key = c.linkedin_url || c.name;
    const { data } = await supabase.from("applications").insert({
      full_name: c.name,
      email: c.email || "",
      role_title: roleDesc,
      status: "new",
      source: "ai_sourced",
      linkedin_url: c.linkedin_url,
    }).select("id").single();
    if (data) setAddedIds(prev => new Set([...prev, key]));
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `${C.violet}15`, border: `1px solid ${C.violet}40`, borderRadius: 100, padding: "5px 18px", marginBottom: 16, fontSize: 10, fontWeight: 800, color: C.violet, letterSpacing: "0.14em", textTransform: "uppercase" }}>◈ AI Talent Sourcing</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: C.text, margin: "0 0 6px", letterSpacing: "-0.02em" }}>AI Talent Sourcing Engine</h1>
        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Describe a role to get a candidate profile, sourcing strategy, boolean strings, and outreach templates — powered by AI.</p>
      </div>

      {/* Input card */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Describe the role you're hiring for</label>
        <textarea
          rows={3}
          value={roleDesc}
          onChange={e => setRoleDesc(e.target.value)}
          placeholder="e.g. Senior GPU Infrastructure Engineer with bare-metal NVIDIA experience, InfiniBand networking, Kubernetes at scale — Atlanta or remote"
          style={{ width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 13px", color: C.text, fontSize: 14, outline: "none", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", marginBottom: 12 }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Atlanta, GA"
              style={{ width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 14, outline: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Key Skills (comma-separated)</label>
            <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="NVIDIA H100, InfiniBand, Kubernetes"
              style={{ width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 14, outline: "none" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleGenerate} disabled={generating || !roleDesc.trim()}
            style={{ flex: 1, background: C.violet, border: "none", borderRadius: 8, padding: "13px 0", color: "#fff", fontSize: 14, fontWeight: 700, cursor: generating ? "default" : "pointer", opacity: generating ? 0.7 : 1, fontFamily: "inherit" }}>
            {generating ? "◈ Generating strategy…" : "✦ Generate Sourcing Strategy"}
          </button>
          <button onClick={handleSourceCandidates} disabled={sourcing || !roleDesc.trim()}
            style={{ background: C.blue, border: "none", borderRadius: 8, padding: "13px 20px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: sourcing ? "default" : "pointer", opacity: sourcing ? 0.7 : 1, fontFamily: "inherit", whiteSpace: "nowrap" }}>
            {sourcing ? "Sourcing…" : "◈ Source Candidates"}
          </button>
        </div>
      </div>

      {/* PDL candidate results */}
      {(candidates.length > 0 || sourcingError) && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.blue, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>◈ Sourced Candidates — People Data Labs</div>
          {sourcingError && <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>{sourcingError}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {candidates.map((c, i) => {
              const key = c.linkedin_url || c.name;
              const added = addedIds.has(key);
              return (
                <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${C.blue}15`, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {c.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{c.title}{c.company ? ` · ${c.company}` : ""}</div>
                    {c.location && <div style={{ fontSize: 12, color: C.muted }}>📍 {c.location}</div>}
                    {c.email && <div style={{ fontSize: 12, color: C.muted }}>✉ {c.email}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {c.linkedin_url && (
                      <a href={c.linkedin_url} target="_blank" rel="noreferrer"
                        style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "6px 12px", color: C.blue, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                        LinkedIn →
                      </a>
                    )}
                    <button onClick={() => addToPipeline(c)} disabled={added}
                      style={{ background: added ? "#ECFDF5" : C.blue, border: "none", borderRadius: 6, padding: "6px 12px", color: added ? C.emerald : "#fff", fontSize: 12, fontWeight: 600, cursor: added ? "default" : "pointer", fontFamily: "inherit" }}>
                      {added ? "✓ Added" : "+ Pipeline"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Strategy result */}
      {(generating || aiResult) && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.violet}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.violet, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>✦ AI Sourcing Strategy</div>
          {generating
            ? <span style={{ color: C.violet, fontWeight: 600, fontSize: 14 }}>◈ Building your sourcing strategy…</span>
            : <div>{renderMd(aiResult)}</div>}
        </div>
      )}

      {/* Passive Candidate Radar */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.amber, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>◎ Passive Candidate Radar — Open Roles</div>
        {openRoles.length === 0
          ? <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>No applications yet.</p>
          : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {openRoles.map(({ role, count }) => (
                <div key={role} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{role}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{count} candidate{count !== 1 ? "s" : ""} in pipeline</div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
