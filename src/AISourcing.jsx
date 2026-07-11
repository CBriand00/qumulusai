import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { brand, company } from "./brand";

const C = {
  bg: "#F7F8FA", surface: "#FFFFFF", border: "#E5E7EB",
  text: "#0F172A", muted: "#64748B", violet: "#7C3AED", blue: "#2563EB",
  emerald: "#059669", amber: "#D97706", rose: "#E11D48",
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
  const [location, setLocation]   = useState(company.location);
  const [skills, setSkills]       = useState("");
  const [aiResult, setAiResult]   = useState("");
  const [generating, setGenerating] = useState(false);

  // Candidate sourcing
  const [sourcing, setSourcing]   = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [candidateSource, setCandidateSource] = useState(""); // "real" | "example"
  const [sourcingError, setSourcingError] = useState("");
  const [sourcingNotice, setSourcingNotice] = useState("");
  const [addedIds, setAddedIds]   = useState(new Set());

  // Conversational sourcing chat
  const [chat, setChat] = useState([]); // { role: "user" | "assistant", content }
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef(null);

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, chatBusy]);

  const skillList = () => skills.split(",").map(s => s.trim()).filter(Boolean);

  async function handleGenerate() {
    if (!roleDesc.trim()) return;
    setGenerating(true);
    setAiResult("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-query", {
        body: {
          max_tokens: 1500,
          system: `You are ${brand.name}'s AI Talent Sourcing engine. When given a role description, generate:
1. IDEAL CANDIDATE PROFILE: skills, experience, background
2. WHERE TO FIND THEM: specific communities, companies, schools, events
3. BOOLEAN SEARCH STRINGS: for LinkedIn Recruiter
4. OUTREACH MESSAGE: personalized cold outreach template
5. SCREENING QUESTIONS: 5 questions to qualify candidates
6. COMPENSATION BENCHMARK: market rate for this role
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

  // Real candidate sourcing via People Data Labs (source-candidates edge function).
  // Accepts optional overrides so the chat copilot can drive the search directly.
  async function handleSourceReal(roleArg, locArg, skArg) {
    const role = (roleArg ?? roleDesc).trim();
    const loc = locArg ?? location;
    const sk = skArg ?? skillList();
    if (!role) return;
    setSourcing(true);
    setCandidates([]);
    setCandidateSource("");
    setSourcingError("");
    setSourcingNotice("");
    try {
      const { data, error } = await supabase.functions.invoke("source-candidates", {
        body: { role_title: role, location: loc, skills: sk, size: 10 },
      });
      if (error) { setSourcingError("Error: " + error.message); setSourcing(false); return; }

      if (data?.configured === false) {
        setSourcingNotice(data.message || "Candidate sourcing isn't connected yet.");
        setSourcing(false);
        return;
      }
      if (data?.error) { setSourcingError("Sourcing error: " + data.error); setSourcing(false); return; }
      if (!data?.candidates?.length) {
        setSourcingNotice("No matching candidates found. Try broadening the role or skills.");
        setSourcing(false);
        return;
      }

      setCandidates(data.candidates.map(c => ({ ...c, location: c.location || loc })));
      setCandidateSource("real");
    } catch (e) {
      setSourcingError("Sourcing error: " + e.message);
    }
    setSourcing(false);
  }

  // Extract a structured search from the chat and run the real sourcing query.
  async function findCandidatesFromChat() {
    if (chatBusy || sourcing || chat.length === 0) return;
    setSourcing(true);
    setCandidates([]);
    setCandidateSource("");
    setSourcingError("");
    setSourcingNotice("");
    try {
      const convo = chat.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
      const { data, error } = await supabase.functions.invoke("ai-query", {
        body: {
          max_tokens: 400,
          system: `Extract the target candidate search from this recruiting conversation. Return ONLY valid JSON, no markdown: {"role_title": string, "skills": string[], "location": string}. Use the most specific target job title discussed. If a field is unknown use "" (or [] for skills).`,
          messages: [{ role: "user", content: convo }],
        },
      });
      if (error) throw error;
      const text = data?.content?.map(b => b.text || "").join("") || "";
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) { setSourcingError("Couldn't extract a profile from the chat — refine it a bit more."); setSourcing(false); return; }
      const crit = JSON.parse(m[0]);
      const role = (crit.role_title || roleDesc || "").trim();
      const loc = crit.location || location;
      const sk = Array.isArray(crit.skills) && crit.skills.length ? crit.skills : skillList();
      if (!role) { setSourcingError("The chat doesn't specify a target role yet."); setSourcing(false); return; }
      // Reflect the extracted profile in the form so it's visible and editable.
      setRoleDesc(role);
      if (loc) setLocation(loc);
      if (sk.length) setSkills(sk.join(", "));
      await handleSourceReal(role, loc, sk);
    } catch (e) {
      setSourcingError("Couldn't apply profile from chat: " + e.message);
      setSourcing(false);
    }
  }

  // AI-generated EXAMPLE profiles (clearly labeled — not real people). Useful for
  // demos and previewing the workflow when PDL isn't connected.
  async function handleGenerateExamples() {
    if (!roleDesc.trim()) return;
    setSourcing(true);
    setCandidates([]);
    setCandidateSource("");
    setSourcingError("");
    setSourcingNotice("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-query", {
        body: {
          max_tokens: 1200,
          system: "You are a talent sourcing assistant. Return ONLY valid JSON — no markdown, no explanation, just the raw JSON array.",
          messages: [{
            role: "user",
            content: `Generate 5 realistic EXAMPLE candidate profiles for a ${roleDesc} position in ${location || "Atlanta, GA"}. Return a JSON array where each object has exactly these fields: name (string), title (string), company (string), years_experience (number), skills (array of strings), linkedin_url (string in format linkedin.com/in/firstname-lastname), why_fit (string). Make the profiles realistic and varied.`,
          }],
        },
      });
      if (error) { setSourcingError("Error: " + error.message); setSourcing(false); return; }
      const text = data?.content?.[0]?.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) { setSourcingError("Could not parse AI response. Try again."); setSourcing(false); return; }
      const people = JSON.parse(jsonMatch[0]);
      setCandidates(people.map(p => ({
        name: p.name, title: p.title, company: p.company,
        location: location || "Atlanta, GA",
        linkedin_url: p.linkedin_url?.startsWith("http") ? p.linkedin_url : `https://${p.linkedin_url}`,
        skills: p.skills, why_fit: p.why_fit, years_experience: p.years_experience,
      })));
      setCandidateSource("example");
    } catch (e) {
      setSourcingError("Sourcing error: " + e.message);
    }
    setSourcing(false);
  }

  async function sendChat(text) {
    const content = (text ?? chatInput).trim();
    if (!content || chatBusy) return;
    const next = [...chat, { role: "user", content }];
    setChat(next);
    setChatInput("");
    setChatBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-query", {
        body: {
          max_tokens: 900,
          system: `You are ${brand.name}'s conversational sourcing copilot. Help the recruiter define and refine an ideal-candidate profile through natural conversation. Ask sharp clarifying questions (seniority, must-have skills, industries, location, dealbreakers). When you have enough, summarize the search as: target titles, must-have skills, nice-to-haves, locations, and 2-3 LinkedIn boolean strings. Keep replies concise and practical. When the profile is clear, remind them they can hit "Find real candidates" to pull live matches.`,
          messages: next.map(m => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      let reply;
      if (data?.error) {
        reply = "AI error: " + (typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      } else {
        reply = data?.content?.map(b => b.text || "").join("") || "No response.";
      }
      setChat([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setChat([...next, { role: "assistant", content: "Couldn't reach AI: " + e.message }]);
    }
    setChatBusy(false);
  }

  async function addToPipeline(c) {
    const key = c.linkedin_url || c.name;
    const { data } = await supabase.from("applications").insert({
      full_name: c.name,
      email: c.email || "",
      role_title: roleDesc,
      status: "new",
      source: candidateSource === "real" ? "pdl_sourced" : "ai_sourced",
      linkedin_url: c.linkedin_url,
    }).select("id").single();
    if (data) setAddedIds(prev => new Set([...prev, key]));
  }

  const inputStyle = { width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 14, outline: "none" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: `${C.violet}15`, border: `1px solid ${C.violet}40`, borderRadius: 100, padding: "5px 18px", marginBottom: 16, fontSize: 10, fontWeight: 800, color: C.violet, letterSpacing: "0.14em", textTransform: "uppercase" }}>◈ AI Talent Sourcing</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: C.text, margin: "0 0 6px", letterSpacing: "-0.02em" }}>AI Talent Sourcing Engine</h1>
        <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Chat to define the ideal profile, pull real candidates, and generate a full sourcing strategy — powered by AI.</p>
      </div>

      {/* Input card */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Describe the role you're hiring for</label>
        <textarea
          rows={3}
          value={roleDesc}
          onChange={e => setRoleDesc(e.target.value)}
          placeholder="e.g. Senior GPU Infrastructure Engineer with bare-metal NVIDIA experience, InfiniBand networking, Kubernetes at scale — Atlanta or remote"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", marginBottom: 12 }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Atlanta, GA" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Key Skills (comma-separated)</label>
            <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="NVIDIA H100, InfiniBand, Kubernetes" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => handleSourceReal()} disabled={sourcing || !roleDesc.trim()}
            style={{ flex: "1 1 200px", background: C.blue, border: "none", borderRadius: 8, padding: "13px 20px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: sourcing ? "default" : "pointer", opacity: sourcing ? 0.7 : 1, fontFamily: "inherit", whiteSpace: "nowrap" }}>
            {sourcing ? "Sourcing…" : "◈ Find Real Candidates"}
          </button>
          <button onClick={handleGenerate} disabled={generating || !roleDesc.trim()}
            style={{ flex: "1 1 200px", background: C.violet, border: "none", borderRadius: 8, padding: "13px 0", color: "#fff", fontSize: 14, fontWeight: 700, cursor: generating ? "default" : "pointer", opacity: generating ? 0.7 : 1, fontFamily: "inherit" }}>
            {generating ? "◈ Generating…" : "✦ Sourcing Strategy"}
          </button>
          <button onClick={handleGenerateExamples} disabled={sourcing || !roleDesc.trim()}
            title="AI-generated example profiles — not real people. For demos / previewing the workflow."
            style={{ flex: "0 1 auto", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "13px 16px", color: C.muted, fontSize: 13, fontWeight: 600, cursor: sourcing ? "default" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Preview examples
          </button>
        </div>
      </div>

      {/* Sourcing notice (e.g. PDL not configured / no results) */}
      {sourcingNotice && (
        <div style={{ background: `${C.amber}10`, border: `1px solid ${C.amber}40`, borderRadius: 12, padding: "14px 18px", marginBottom: 16, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
          {sourcingNotice}
        </div>
      )}

      {/* Candidate results */}
      {(candidates.length > 0 || sourcingError) && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.blue, letterSpacing: "0.12em", textTransform: "uppercase" }}>◈ Sourced Candidates</div>
            {candidateSource === "real" && <span style={{ fontSize: 10, fontWeight: 700, color: C.emerald, background: `${C.emerald}12`, border: `1px solid ${C.emerald}30`, borderRadius: 100, padding: "2px 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Live · PDL</span>}
            {candidateSource === "example" && <span style={{ fontSize: 10, fontWeight: 700, color: C.amber, background: `${C.amber}12`, border: `1px solid ${C.amber}30`, borderRadius: 100, padding: "2px 10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>AI examples · not real people</span>}
          </div>
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
                    {c.location && <div style={{ fontSize: 12, color: C.muted }}>📍 {c.location}{c.years_experience ? ` · ${c.years_experience} yrs exp` : ""}</div>}
                    {c.skills?.length > 0 && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{c.skills.slice(0, 4).join(" · ")}</div>}
                    {c.why_fit && <div style={{ fontSize: 12, color: "#374151", marginTop: 4, lineHeight: 1.4 }}>{c.why_fit}</div>}
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

      {/* Conversational sourcing copilot */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.violet, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>✦ Sourcing Copilot</div>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 14px" }}>Chat to refine exactly who you're looking for — then hit “Find Real Candidates” above.</p>

        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, maxHeight: 340, overflowY: "auto", marginBottom: 12 }}>
          {chat.length === 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {[
                "Help me define an ideal profile for a staff-level ML infra engineer",
                "Who should I target for a first enterprise AE in the Southeast?",
                "Turn my role above into LinkedIn boolean strings",
              ].map(q => (
                <button key={q} onClick={() => sendChat(q)}
                  style={{ background: `${C.violet}0D`, border: `1px solid ${C.violet}30`, borderRadius: 100, padding: "7px 14px", fontSize: 12, color: C.violet, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                  {q}
                </button>
              ))}
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div style={{
                maxWidth: "82%", padding: "10px 13px", borderRadius: 12, fontSize: 13.5, lineHeight: 1.6,
                background: m.role === "user" ? C.violet : C.surface,
                color: m.role === "user" ? "#fff" : "#334155",
                border: m.role === "user" ? "none" : `1px solid ${C.border}`,
                borderBottomRightRadius: m.role === "user" ? 3 : 12,
                borderBottomLeftRadius: m.role === "user" ? 12 : 3,
              }}>
                {m.role === "user" ? m.content : <div>{renderMd(m.content)}</div>}
              </div>
            </div>
          ))}
          {chatBusy && <div style={{ fontSize: 13, color: C.violet, fontWeight: 600 }}>◈ Thinking…</div>}
          <div ref={chatEndRef} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
            placeholder="Describe who you're looking for, or ask for boolean strings…"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={() => sendChat()} disabled={chatBusy || !chatInput.trim()}
            style={{ background: C.violet, border: "none", borderRadius: 8, padding: "0 20px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: chatBusy || !chatInput.trim() ? "default" : "pointer", opacity: chatBusy || !chatInput.trim() ? 0.6 : 1, fontFamily: "inherit" }}>
            Send
          </button>
        </div>

        {/* Turn the refined conversation into a real candidate search. */}
        {chat.some(m => m.role === "assistant") && (
          <button onClick={findCandidatesFromChat} disabled={sourcing || chatBusy}
            style={{ marginTop: 10, width: "100%", background: `${C.blue}12`, border: `1px solid ${C.blue}40`, borderRadius: 8, padding: "11px 0", color: C.blue, fontSize: 13.5, fontWeight: 700, cursor: sourcing || chatBusy ? "default" : "pointer", opacity: sourcing || chatBusy ? 0.6 : 1, fontFamily: "inherit" }}>
            {sourcing ? "Sourcing…" : "◈ Find candidates from this chat"}
          </button>
        )}
      </div>

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
