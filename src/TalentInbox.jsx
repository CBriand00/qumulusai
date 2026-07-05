import { useState, useEffect, useCallback } from "react";
import { useBreakpoint } from "./useBreakpoint";
import { supabase } from "./supabase";

const STATUSES = ["new", "reviewing", "interview", "offer", "rejected", "hired"];

const STATUS_META = {
  new:       { label: "New",       color: "#7C3AED", bg: "#F5F3FF" },
  reviewing: { label: "Reviewing", color: "#D97706", bg: "#FFFBEB" },
  interview: { label: "Interview", color: "#2563EB", bg: "#EFF6FF" },
  offer:     { label: "Offer",     color: "#059669", bg: "#ECFDF5" },
  rejected:  { label: "Rejected",  color: "#64748B", bg: "#F1F5F9" },
  hired:     { label: "Hired",     color: "#16A34A", bg: "#F0FDF4" },
};

export default function TalentInbox() {
  const [apps, setApps]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState("");
  const [updating, setUpdating] = useState(null);
  const [scores, setScores]     = useState({});
  const { isMobile } = useBreakpoint();

  const fetchApps = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: assess }] = await Promise.all([
      supabase.from("applications").select("*").order("created_at", { ascending: false }),
      supabase.from("candidate_assessments").select("application_id, overall_score, status"),
    ]);
    if (!error) setApps(data ?? []);
    const sm = {};
    (assess ?? []).forEach((a) => {
      if (a.status === "scored" && a.overall_score != null && sm[a.application_id] == null) sm[a.application_id] = a.overall_score;
    });
    setScores(sm);
    setLoading(false);
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  useEffect(() => {
    const channel = supabase
      .channel("applications_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, (payload) => {
        if (payload.eventType === "INSERT") setApps((prev) => [payload.new, ...prev]);
        else if (payload.eventType === "UPDATE") {
          setApps((prev) => prev.map((a) => (a.id === payload.new.id ? payload.new : a)));
          setSelected((s) => (s?.id === payload.new.id ? payload.new : s));
        } else if (payload.eventType === "DELETE") {
          setApps((prev) => prev.filter((a) => a.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function updateStatus(id, newStatus) {
    setUpdating(id);
    await supabase.from("applications").update({ status: newStatus }).eq("id", id);
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, status: newStatus } : a));
    setSelected((s) => s?.id === id ? { ...s, status: newStatus } : s);
    if (newStatus === "hired") {
      const app = apps.find((a) => a.id === id);
      if (app) {
        await supabase.from("employees").insert({
          full_name: app.full_name,
          email: app.email,
          role_title: app.role_title,
          application_id: app.id,
          status: "active",
          start_date: new Date().toISOString().slice(0, 10),
        });
      }
    }
    setUpdating(null);
  }

  const q = search.trim().toLowerCase();
  const visible = apps.filter((a) => !q || a.full_name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q) || a.role_title?.toLowerCase().includes(q));
  const byStatus = STATUSES.reduce((acc, s) => { acc[s] = visible.filter((a) => a.status === s); return acc; }, {});

  return (
    <div style={board.shell}>
      {/* Header */}
      <div style={board.header}>
        <div>
          <h1 style={board.title}>Talent Pipeline</h1>
          <p style={board.subtitle}>{loading ? "Loading…" : `${apps.length} candidate${apps.length !== 1 ? "s" : ""} across ${STATUSES.length} stages`}</p>
        </div>
        <div style={board.tools}>
          <div style={board.searchWrap}>
            <span style={board.searchIcon}>⌕</span>
            <input style={board.search} placeholder="Search candidates…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button style={board.refreshBtn} onClick={fetchApps}>↻ Refresh</button>
        </div>
      </div>

      {/* Kanban board */}
      <div style={board.columns}>
        {STATUSES.map((s) => {
          const m = STATUS_META[s];
          const colApps = byStatus[s];
          return (
            <div key={s} style={board.column}>
              <div style={board.colHeader}>
                <span style={board.colHeaderLeft}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: m.color }} />
                  <span style={board.colTitle}>{m.label}</span>
                </span>
                <span style={{ ...board.colCount, background: m.bg, color: m.color }}>{colApps.length}</span>
              </div>
              <div style={board.colBody}>
                {colApps.map((app) => (
                  <BoardCard key={app.id} app={app} score={scores[app.id]} selected={selected?.id === app.id} onClick={() => setSelected(app)} />
                ))}
                {colApps.length === 0 && <div style={board.colEmpty}>—</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over detail drawer */}
      {selected && (
        <>
          <div style={board.scrim} onClick={() => setSelected(null)} />
          <aside style={{ ...board.drawer, ...(isMobile ? { width: "100%" } : {}) }}>
            <button style={board.drawerClose} onClick={() => setSelected(null)}>✕ Close</button>
            <DetailPanel app={selected} onUpdateStatus={updateStatus} updating={updating === selected.id} />
          </aside>
        </>
      )}
    </div>
  );
}

function BoardCard({ app, score, selected, onClick }) {
  const m = STATUS_META[app.status] ?? STATUS_META.new;
  const [hover, setHover] = useState(false);
  const date = new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const scoreColor = score == null ? null : score >= 70 ? "#059669" : score >= 50 ? "#D97706" : "#DC2626";
  const scoreBg = score == null ? null : score >= 70 ? "#ECFDF5" : score >= 50 ? "#FFFBEB" : "#FEF2F2";
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ ...board.card, borderColor: selected ? m.color : (hover ? "#CBD5E1" : C.border), boxShadow: hover || selected ? "0 4px 14px rgba(15,23,42,0.10)" : "0 1px 2px rgba(15,23,42,0.04)", transform: hover ? "translateY(-1px)" : "none" }}>
      <div style={board.cardTop}>
        <div style={{ ...board.cardAvatar, background: m.bg, color: m.color }}>{initials(app.full_name)}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={board.cardName}>{app.full_name}</div>
          <div style={board.cardRole}>{app.role_title}</div>
        </div>
      </div>
      <div style={board.cardFooter}>
        <span style={board.cardDate}>{date}</span>
        {score != null && <span style={{ ...board.cardScore, background: scoreBg, color: scoreColor }}>{score}/100</span>}
      </div>
    </div>
  );
}

function DetailPanel({ app, onUpdateStatus, updating }) {
  const m = STATUS_META[app.status] ?? STATUS_META.new;
  const date = new Date(app.created_at).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div style={styles.detailInner}>
      <div style={styles.detailHeader}>
        <div style={{ ...styles.detailAvatar, background: m.bg, color: m.color }}>{initials(app.full_name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={styles.detailName}>{app.full_name}</h2>
          <p style={styles.detailRole}>{app.role_title} · {app.department}</p>
        </div>
        <div style={{ ...styles.statusBadge, background: m.bg, color: m.color, alignSelf: "flex-start", margin: 0 }}>{m.label}</div>
      </div>
      <Section title="Contact">
        <DetailRow label="Email" value={<a href={`mailto:${app.email}`} style={styles.link}>{app.email}</a>} />
        {app.phone && <DetailRow label="Phone" value={app.phone} />}
        {app.linkedin_url && <DetailRow label="LinkedIn" value={<a href={app.linkedin_url} target="_blank" rel="noreferrer" style={styles.link}>View profile</a>} />}
        <DetailRow label="Applied" value={date} />
      </Section>
      {app.cover_letter && (
        <Section title="Cover Letter">
          <p style={styles.coverLetter}>{app.cover_letter}</p>
        </Section>
      )}
      <AssessmentResults app={app} />
      {app.status === "interview" && <ScheduleInterview app={app} />}
      {app.status === "interview" && <InterviewIntelligence app={app} />}
      {app.status === "offer" && <OfferLetter app={app} />}
      <Section title="Move Pipeline">
        <div style={styles.pipelineGrid}>
          {STATUSES.map((s) => {
            const sm = STATUS_META[s];
            const active = app.status === s;
            return (
              <button key={s} disabled={active || updating} onClick={() => onUpdateStatus(app.id, s)}
                style={{ ...styles.pipeBtn, ...(active ? { background: sm.bg, color: sm.color, borderColor: sm.color } : {}), opacity: updating ? 0.5 : 1 }}>
                {sm.label}
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <p style={styles.sectionLabel}>{title.toUpperCase()}</p>
      {children}
    </div>
  );
}

function ScheduleInterview({ app }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSchedule() {
    if (!date || !time || !interviewer) return;
    setSaving(true);
    await supabase.from("interviews").insert({
      application_id: app.id,
      candidate_name: app.full_name,
      role: app.role_title,
      interviewer, date, time, notes,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <Section title="Schedule Interview">
      <input style={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
      <input style={styles.input} type="time" value={time} onChange={e => setTime(e.target.value)} />
      <input style={styles.input} placeholder="Interviewer name" value={interviewer} onChange={e => setInterviewer(e.target.value)} />
      <textarea style={{...styles.input, height: 80, resize: "vertical"}} placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
      <button style={{...styles.pipeBtn, background: "#EFF6FF", color: "#2563EB", borderColor: "#2563EB"}} onClick={handleSchedule} disabled={saving}>
        {saved ? "✓ Scheduled!" : saving ? "Saving…" : "Schedule Interview"}
      </button>
    </Section>
  );
}

function ScoreBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748B", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}/100</span>
      </div>
      <div style={{ height: 6, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 4, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

function AssessmentResults({ app }) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("candidate_assessments")
        .select("*")
        .eq("application_id", app.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      setAssessment(data || null);
      setLoading(false);
    }
    load();
  }, [app.id]);

  if (loading) return (
    <Section title="Assessment">
      <div style={{ fontSize: 13, color: "#94A3B8" }}>Loading assessment…</div>
    </Section>
  );

  if (!assessment) return (
    <Section title="Assessment">
      <div style={{ fontSize: 13, color: "#94A3B8" }}>No assessment sent yet.</div>
    </Section>
  );

  const score = assessment.overall_score;
  const scored = assessment.status === "scored";
  const scoreColor = score >= 70 ? "#059669" : score >= 50 ? "#D97706" : "#DC2626";
  const scoreBg = score >= 70 ? "#ECFDF5" : score >= 50 ? "#FFFBEB" : "#FEF2F2";
  const scoreTier = score >= 70 ? "Strong Fit" : score >= 50 ? "Potential Fit" : "Low Fit";
  const dims = assessment.dimension_scores || {};

  return (
    <Section title="Assessment Results">
      {assessment.status === "pending" && (
        <div style={{ fontSize: 13, color: "#D97706", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px" }}>
          ⏳ Assessment sent — awaiting candidate submission.
        </div>
      )}
      {assessment.status === "submitted" && (
        <div style={{ fontSize: 13, color: "#2563EB", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px" }}>
          ◈ Submitted — scoring in progress…
        </div>
      )}
      {scored && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ background: scoreBg, border: `2px solid ${scoreColor}`, borderRadius: 12, padding: "12px 20px", textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: 10, color: scoreColor, fontWeight: 700, marginTop: 2 }}>/100</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: scoreColor }}>{scoreTier}</div>
              {assessment.ai_explanation && (
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, marginTop: 4 }}>{assessment.ai_explanation}</div>
              )}
            </div>
          </div>

          {Object.keys(dims).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {dims.role_fit != null && <ScoreBar label="Role Fit" value={dims.role_fit} color="#7C3AED" />}
              {dims.problem_solving != null && <ScoreBar label="Problem Solving" value={dims.problem_solving} color="#2563EB" />}
              {dims.culture_values != null && <ScoreBar label="Culture & Values" value={dims.culture_values} color="#0D9488" />}
              {dims.communication != null && <ScoreBar label="Communication" value={dims.communication} color="#D97706" />}
            </div>
          )}

          {assessment.risk_indicators?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Risk Indicators</div>
              {assessment.risk_indicators.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: "#DC2626", padding: "4px 0", borderBottom: "1px solid #FEE2E2", display: "flex", gap: 6 }}>
                  <span>⚠</span><span>{r}</span>
                </div>
              ))}
            </div>
          )}

          {assessment.interview_recommendations?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Interview Focus</div>
              {assessment.interview_recommendations.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: "#334155", padding: "4px 0" }}>• {r}</div>
              ))}
            </div>
          )}

          {assessment.suggested_questions?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Suggested Interview Questions</div>
              {assessment.suggested_questions.map((q, i) => (
                <div key={i} style={{ fontSize: 12, color: "#334155", padding: "5px 0", borderBottom: "1px solid #E2E8F0" }}>{i + 1}. {q}</div>
              ))}
            </div>
          )}

          {score >= 70 && (
            <div style={{ marginTop: 12, background: "#ECFDF5", border: "1px solid #86EFAC", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#059669", fontWeight: 600 }}>
              ✓ Recommended for interview — move to Interview stage to schedule.
            </div>
          )}
        </>
      )}
    </Section>
  );
}

function renderMd(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    const t = line.trim();
    const bold = (s) => s.split(/(\*\*[^*]+\*\*)/).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2,-2)}</strong> : p
    );
    if (t.startsWith("### ")) return <h3 key={i} style={{ fontSize: 13, fontWeight: 700, margin: "12px 0 4px", color: "#0F172A" }}>{t.slice(4)}</h3>;
    if (t.startsWith("## "))  return <h2 key={i} style={{ fontSize: 14, fontWeight: 700, margin: "14px 0 4px", color: "#0F172A" }}>{t.slice(3)}</h2>;
    if (t === "---") return <hr key={i} style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "8px 0" }} />;
    if (t === "") return <div key={i} style={{ height: 4 }} />;
    return <p key={i} style={{ margin: "2px 0", fontSize: 13, lineHeight: 1.7, color: "#334155" }}>{bold(t)}</p>;
  });
}

function InterviewIntelligence({ app }) {
  const [notes, setNotes]     = useState("");
  const [debrief, setDebrief] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  async function generateDebrief() {
    if (!notes.trim()) return;
    setGenerating(true);
    setDebrief("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-query", {
        body: {
          max_tokens: 1200,
          system: `You are QumulusAI's Interview Intelligence engine. When given interview notes or a transcript, produce a structured debrief with:
OVERALL RECOMMENDATION: (Strong Hire / Hire / No Hire / Strong No Hire)
EXECUTIVE SUMMARY (2-3 sentences)
COMPETENCY ASSESSMENT: rate key competencies 1-5 with evidence
KEY STRENGTHS
RISKS & CONCERNS
SUGGESTED FOLLOW-UP QUESTIONS
Be direct. Hiring managers need clarity.`,
          messages: [{ role: "user", content: `Candidate: ${app.full_name}\nRole: ${app.role_title} (${app.department})\n\nInterview Notes / Transcript:\n${notes}` }],
        },
      });
      if (error) throw error;
      setDebrief(data?.content?.[0]?.text || "");
    } catch (e) {
      setDebrief("Error generating debrief: " + e.message);
    }
    setGenerating(false);
  }

  async function saveDebrief() {
    setSaving(true);
    await supabase.from("interviews")
      .update({ interview_debrief: debrief })
      .eq("application_id", app.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <Section title="Interview Intelligence">
      <textarea
        style={{ ...styles.input, height: 100, resize: "vertical", fontFamily: "inherit" }}
        placeholder="Paste interview notes or transcript here…"
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
      <button
        style={{ ...styles.pipeBtn, background: "#EFF6FF", color: "#2563EB", borderColor: "#2563EB" }}
        onClick={generateDebrief}
        disabled={generating || !notes.trim()}>
        {generating ? "Generating…" : "✦ Generate AI Debrief"}
      </button>
      {(generating || debrief) && (
        <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderLeft: "3px solid #2563EB", borderRadius: 8, padding: 14, marginTop: 4 }}>
          {generating
            ? <span style={{ color: "#2563EB", fontWeight: 600, fontSize: 13 }}>◈ Analyzing interview…</span>
            : renderMd(debrief)}
        </div>
      )}
      {debrief && !generating && (
        <button
          style={{ ...styles.pipeBtn, background: "#ECFDF5", color: "#059669", borderColor: "#059669" }}
          onClick={saveDebrief}
          disabled={saving}>
          {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Debrief"}
        </button>
      )}
    </Section>
  );
}

function OfferLetter({ app }) {
  const [salary, setSalary] = useState("");
  const [startDate, setStartDate] = useState("");
  const [letter, setLetter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedLink, setSavedLink] = useState("");
  const [bonus, setBonus] = useState("");
  const [rsu, setRsu] = useState("");
  const [signOnBonus, setSignOnBonus] = useState("");
  const [relocation, setRelocation] = useState("");

  async function generateLetter() {
    if (!salary || !startDate) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-query", {
        body: {
          max_tokens: 1000,
          messages: [{ role: "user", content: `Write a professional offer letter from QumulusAI (the hiring company) to ${app.full_name} (the candidate) for the role of ${app.role_title} in the ${app.department} department. Always refer to the employer as "QumulusAI" — never use the candidate's name as the company name. Compensation: Base Salary $${salary}, Start Date ${startDate}${bonus ? `, Annual Bonus ${bonus}` : ''}${rsu ? `, RSU Grant ${rsu}` : ''}${signOnBonus ? `, Sign-On Bonus ${signOnBonus}` : ''}${relocation ? `, Relocation Assistance ${relocation}` : ''}. Do not include a title or heading like "OFFER LETTER" at the very start of the letter — begin directly with the company name and date. Only mention compensation items that have values provided.` }],
        },
      });
      if (error) throw error;
      setLetter(data?.content?.[0]?.text || "");
    } catch (e) {
      setLetter("Error generating letter: " + e.message);
    }
    setGenerating(false);
  }

  async function saveOffer() {
    setSaving(true);
    const { data } = await supabase.from("offers").insert({
      application_id: app.id,
      candidate_name: app.full_name,
      role: app.role_title,
      department: app.department,
      salary, bonus,
      rsu,
      sign_on_bonus: signOnBonus,
      relocation,
      start_date: startDate,
      letter,
      candidate_email: app.email,
    }).select().single();
    if (data) {
      const link = `https://qumulusai.vercel.app?sign=${data.signing_token}`;
      setSavedLink(link); 
      await supabase.functions.invoke('send-offer-email', {
        body: {
          candidateEmail: app.email,
          candidateName: app.full_name,
          role: app.role_title,
          signingLink: link,
        },
      });
    }
    setSaving(false);
    setSaved(true);
  }

  return (
    <Section title="Generate Offer Letter">
      <input style={styles.input} placeholder="Salary (e.g. $120,000)" value={salary} onChange={e => setSalary(e.target.value)} />
      <input style={styles.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
      <input style={styles.input} placeholder="Annual Bonus (optional, e.g. $20,000)" value={bonus} onChange={e => setBonus(e.target.value)} />
      <input style={styles.input} placeholder="RSU Grant (optional, e.g. $50,000 over 4 years)" value={rsu} onChange={e => setRsu(e.target.value)} />
      <input style={styles.input} placeholder="Sign-On Bonus (optional, e.g. $10,000)" value={signOnBonus} onChange={e => setSignOnBonus(e.target.value)} />
      <input style={styles.input} placeholder="Relocation Assistance (optional, e.g. $5,000)" value={relocation} onChange={e => setRelocation(e.target.value)} />
      <button style={{...styles.pipeBtn, background: "#ECFDF5", color: "#059669", borderColor: "#059669"}} onClick={generateLetter} disabled={generating}>
        {generating ? "Generating…" : "✦ Generate with AI"}
      </button>
      {letter && (
        <>
          <textarea style={{...styles.input, height: 200, resize: "vertical", marginTop: 8}} value={letter} onChange={e => setLetter(e.target.value)} />
          <button style={{...styles.pipeBtn, background: "#ECFDF5", color: "#059669", borderColor: "#059669"}} onClick={saveOffer} disabled={saving}>
            {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Offer Letter"}
          </button>
          {savedLink && (
            <div style={{...styles.input, marginTop: 8, fontSize: 12, color: "#059669", wordBreak: "break-all"}}>
              📋 Signing link: {savedLink}
            </div>
          )}
        </>
      )}
    </Section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

function initials(name = "") {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const C = { bg: "#F7F8FA", surface: "#FFFFFF", border: "#E5E7EB", accent: "#7C3AED", text: "#0F172A", muted: "#64748B" };

const board = {
  shell: { display: "flex", flexDirection: "column", gap: 18, fontFamily: "'Inter', 'Helvetica Neue', sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  title: { fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13, color: C.muted, margin: "4px 0 0" },
  tools: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  searchWrap: { position: "relative", display: "flex", alignItems: "center" },
  searchIcon: { position: "absolute", left: 12, color: C.muted, fontSize: 15, pointerEvents: "none" },
  search: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 12px 9px 32px", fontSize: 13, outline: "none", minWidth: 220, color: C.text, fontFamily: "inherit" },
  refreshBtn: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, fontSize: 12, fontWeight: 600, padding: "9px 16px", cursor: "pointer", fontFamily: "inherit" },
  columns: { display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, alignItems: "flex-start" },
  column: { flex: "0 0 262px", width: 262, background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 12, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 210px)" },
  colHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: `1px solid ${C.border}` },
  colHeaderLeft: { display: "flex", alignItems: "center", gap: 8 },
  colTitle: { fontSize: 13, fontWeight: 700, color: "#334155" },
  colCount: { fontSize: 11, fontWeight: 800, borderRadius: 20, padding: "2px 9px", minWidth: 22, textAlign: "center" },
  colBody: { display: "flex", flexDirection: "column", gap: 10, padding: 12, overflowY: "auto", flex: 1, minHeight: 60 },
  colEmpty: { textAlign: "center", color: "#CBD5E1", fontSize: 18, padding: "18px 0" },
  card: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s, border-color 0.15s" },
  cardTop: { display: "flex", gap: 10, alignItems: "center" },
  cardAvatar: { width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 },
  cardName: { fontSize: 13, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cardRole: { fontSize: 11, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  cardDate: { fontSize: 11, color: C.muted },
  cardScore: { fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 7px" },
  scrim: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 40 },
  drawer: { position: "fixed", top: 0, right: 0, height: "100vh", width: 460, maxWidth: "100%", background: C.bg, boxShadow: "-8px 0 30px rgba(15,23,42,0.18)", zIndex: 41, overflowY: "auto" },
  drawerClose: { display: "flex", alignItems: "center", gap: 6, background: C.surface, border: "none", borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "14px 20px", width: "100%", textAlign: "left", fontFamily: "inherit", position: "sticky", top: 0, zIndex: 1 },
};

const styles = {
  shell: { display: "grid", gridTemplateColumns: "220px 340px 1fr", height: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', 'Helvetica Neue', sans-serif", overflow: "hidden" },
  sidebar: { borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: C.surface },
  sidebarHeader: { padding: "24px 20px 16px", display: "flex", flexDirection: "column", gap: 5, borderBottom: `1px solid ${C.border}` },
  wordmark: { fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em", color: "#0A2540" },
  ai: { color: C.accent },
  inboxTitle: { fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", color: "#0F172A" },
  inboxLabel: { fontSize: 12, color: C.muted, fontWeight: 500 },
  searchWrap: { padding: "16px 12px 8px" },
  search: { width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, outline: "none" },
  nav: { display: "flex", flexDirection: "column", gap: 2, padding: "8px 12px", overflowY: "auto" },
  navItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 9, border: "none", background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "background 0.12s, color 0.12s" },
  badge: { fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 9px", minWidth: 24, textAlign: "center" },
  list: { borderRight: `1px solid ${C.border}`, overflowY: "auto", display: "flex", flexDirection: "column", background: C.surface },
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.surface, zIndex: 1 },
  listCount: { fontSize: 12, color: C.muted, fontWeight: 500 },
  refreshBtn: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontSize: 12, fontWeight: 600, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.12s, color 0.12s" },
  row: { display: "flex", gap: 12, padding: "15px 20px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.12s", alignItems: "center" },
  rowSelected: { background: "#F5F3FF" },
  rowAvatar: { width: 38, height: 38, borderRadius: "50%", background: "#F5F3FF", color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 },
  rowName: { fontSize: 14, fontWeight: 700, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowMeta: { fontSize: 12, color: C.muted, display: "flex", gap: 6, alignItems: "center" },
  rowRole: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 },
  statusPill: { fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "3px 9px", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.03em" },
  detail: { overflowY: "auto", background: C.bg },
  detailInner: { padding: 32, display: "flex", flexDirection: "column", gap: 28 },
  detailHeader: { display: "flex", gap: 16, alignItems: "center" },
  detailAvatar: { width: 54, height: 54, borderRadius: "50%", background: "#F5F3FF", color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 800, flexShrink: 0 },
  detailName: { fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" },
  detailRole: { fontSize: 13, color: C.muted, margin: "4px 0 0" },
  statusBadge: { alignSelf: "flex-start", fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "4px 14px" },
  section: { display: "flex", flexDirection: "column", gap: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 },
  sectionLabel: { fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: C.muted, margin: 0 },
  detailRow: { display: "flex", gap: 12, fontSize: 14 },
  detailLabel: { color: C.muted, width: 80, flexShrink: 0 },
  detailValue: { color: C.text },
  link: { color: C.accent, textDecoration: "none" },
  coverLetter: { fontSize: 14, lineHeight: 1.7, color: "#334155", margin: 0 },
  pipelineGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  pipeBtn: { padding: "8px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.muted, cursor: "pointer" },
  input: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  empty: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 48, minHeight: 320 },
  emptyCircle: { width: 64, height: 64, borderRadius: "50%", background: "#F5F3FF", color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 4 },
  emptyText: { fontSize: 15, fontWeight: 600, color: "#334155", margin: 0, textAlign: "center" },
  emptySub: { fontSize: 13, color: C.muted, margin: 0, textAlign: "center", maxWidth: 300, lineHeight: 1.6 },
};
