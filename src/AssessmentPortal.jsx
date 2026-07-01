import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const C = {
  bg: "#F0F2F7", bgCard: "#FFFFFF", textDark: "#0D1117", textMid: "#3D4B5C",
  textMuted: "#7E8FA3", border: "#DDE3ED", cyan: "#00C2E0", navy: "#0A2540",
  violet: "#7C3AED",
};

export default function AssessmentPortal({ token }) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from("candidate_assessments")
        .select("*")
        .eq("token", token)
        .single();
      if (err || !data) {
        setError("Assessment not found or this link has expired.");
      } else if (data.status === "completed" || data.status === "scored") {
        setSubmitted(true);
        setAssessment(data);
      } else {
        setAssessment(data);
      }
      setLoading(false);
    }
    load();
  }, [token]);

  function setResponse(sectionKey, questionKey, value) {
    setResponses(prev => ({ ...prev, [`${sectionKey}_${questionKey}`]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    await supabase.functions.invoke("score-assessment", {
      body: { assessmentId: assessment.id, responses },
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  if (loading) return <div style={S.center}>Loading your assessment…</div>;
  if (error) return <div style={S.center}>{error}</div>;

  if (submitted) return (
    <div style={S.wrapper}>
      <header style={S.header}>
        <div style={S.logo}><span style={{ color: C.cyan }}>Q</span>umulusAI <span style={{ color: C.textMuted, fontWeight: 400, fontSize: 13 }}>Assessment</span></div>
      </header>
      <div style={{ ...S.container, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)" }}>
        <div style={{ ...S.card, textAlign: "center", padding: "48px 32px" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✓</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: C.textDark, margin: "0 0 12px", letterSpacing: "-0.02em" }}>Assessment Submitted!</h1>
          <p style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
            Thank you, {assessment?.candidate_name}. Our team will review your responses and be in touch within 2–3 business days.
          </p>
        </div>
      </div>
    </div>
  );

  const sections = assessment?.sections || [];

  return (
    <div style={S.wrapper}>
      <header style={S.header}>
        <div style={S.logo}><span style={{ color: C.cyan }}>Q</span>umulusAI <span style={{ color: C.textMuted, fontWeight: 400, fontSize: 13 }}>Assessment</span></div>
        {assessment?.time_limit_minutes && (
          <div style={S.timePill}>⏱ ~{assessment.time_limit_minutes} min</div>
        )}
      </header>

      <div style={S.container}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={S.h1}>{assessment.role_title} — Candidate Assessment</h1>
          <p style={S.subtitle}>
            Hi {assessment.candidate_name}, please complete all sections below. Be specific and take your time — there are no trick questions.
          </p>
        </div>

        {sections.map((section, si) => (
          <div key={section.id ?? si} style={S.section}>
            <div style={S.sectionHeader}>
              <div style={S.sectionNum}>{si + 1}</div>
              <div>
                <div style={S.sectionTitle}>{section.title}</div>
                {section.description && <div style={S.sectionDesc}>{section.description}</div>}
              </div>
            </div>

            {(section.questions || []).map((q, qi) => {
              const sKey = section.id ?? si;
              const qKey = q.id ?? qi;
              const fullKey = `${sKey}_${qKey}`;
              const val = responses[fullKey];

              return (
                <div key={fullKey} style={S.question}>
                  <div style={S.qLabel}>{q.text}</div>

                  {q.type === "text" && (
                    <textarea
                      style={S.textarea}
                      placeholder="Your answer…"
                      rows={4}
                      value={val || ""}
                      onChange={e => setResponse(sKey, qKey, e.target.value)}
                    />
                  )}

                  {q.type === "multiple_choice" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(q.options || []).map(opt => (
                        <label key={opt} style={{ ...S.optionLabel, background: val === opt ? `${C.navy}08` : "#F8FAFC", borderColor: val === opt ? C.navy : C.border }}>
                          <input
                            type="radio"
                            name={fullKey}
                            value={opt}
                            checked={val === opt}
                            onChange={() => setResponse(sKey, qKey, opt)}
                            style={{ marginRight: 10, accentColor: C.navy }}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "rating" && (
                    <div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {Array.from({ length: q.scale || 5 }, (_, i) => i + 1).map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setResponse(sKey, qKey, n)}
                            style={{
                              ...S.ratingBtn,
                              background: val === n ? C.navy : "#F8FAFC",
                              color: val === n ? "#fff" : C.textMid,
                              borderColor: val === n ? C.navy : C.border,
                            }}
                          >{n}</button>
                        ))}
                      </div>
                      {q.scale && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>1 = Lowest · {q.scale} = Highest</div>}
                    </div>
                  )}

                  {q.type === "ranking" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(q.options || []).map((opt, oi) => {
                        const arr = Array.isArray(val) ? val : Array(q.options.length).fill("");
                        return (
                          <div key={opt} style={S.rankRow}>
                            <select
                              value={arr[oi] || ""}
                              onChange={e => {
                                const next = [...arr];
                                next[oi] = Number(e.target.value);
                                setResponse(sKey, qKey, next);
                              }}
                              style={S.rankSelect}
                            >
                              <option value="">—</option>
                              {q.options.map((_, ri) => <option key={ri} value={ri + 1}>{ri + 1}</option>)}
                            </select>
                            <span style={{ fontSize: 13, color: C.textMid }}>{opt}</span>
                          </div>
                        );
                      })}
                      <div style={{ fontSize: 11, color: C.textMuted }}>Rank each option (1 = most preferred)</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={S.submitBtn}
          >
            {submitting ? "Submitting…" : "Submit Assessment →"}
          </button>
          <p style={{ color: C.textMuted, fontSize: 12, marginTop: 12, textAlign: "center" }}>
            Your responses are shared only with the QumulusAI hiring team.
          </p>
        </div>
      </div>
    </div>
  );
}

const S = {
  wrapper: { minHeight: "100vh", background: C.bg, fontFamily: "'Inter', -apple-system, sans-serif" },
  header: { borderBottom: `1px solid ${C.border}`, padding: "0 40px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", position: "sticky", top: 0, zIndex: 100 },
  logo: { fontWeight: 900, fontSize: 18, color: C.textDark, letterSpacing: "-0.02em" },
  timePill: { background: `${C.cyan}15`, border: `1px solid ${C.cyan}30`, borderRadius: 100, padding: "4px 12px", fontSize: 12, color: C.cyan, fontWeight: 700 },
  container: { maxWidth: 760, margin: "0 auto", padding: "32px 24px" },
  h1: { fontSize: 24, fontWeight: 900, color: C.textDark, margin: "0 0 10px", letterSpacing: "-0.02em" },
  subtitle: { fontSize: 14, color: C.textMid, lineHeight: 1.7, margin: 0 },
  section: { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 20 },
  sectionHeader: { display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` },
  sectionNum: { background: C.navy, color: "#fff", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 },
  sectionTitle: { fontSize: 16, fontWeight: 800, color: C.textDark, letterSpacing: "-0.01em" },
  sectionDesc: { fontSize: 13, color: C.textMuted, marginTop: 4, lineHeight: 1.6 },
  question: { marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${C.border}` },
  qLabel: { fontSize: 14, fontWeight: 600, color: C.textDark, marginBottom: 12, lineHeight: 1.55 },
  textarea: { width: "100%", boxSizing: "border-box", background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: C.textDark, lineHeight: 1.6, fontFamily: "inherit", outline: "none", resize: "vertical" },
  optionLabel: { display: "flex", alignItems: "center", fontSize: 13, color: C.textMid, cursor: "pointer", padding: "10px 14px", borderRadius: 8, border: "1px solid" },
  ratingBtn: { width: 42, height: 42, border: "1px solid", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" },
  rankRow: { display: "flex", alignItems: "center", gap: 12, padding: "6px 0" },
  rankSelect: { background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", color: C.textDark },
  submitBtn: { width: "100%", background: C.navy, color: "#fff", border: "none", borderRadius: 10, padding: "16px 0", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" },
  card: { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, maxWidth: 520, width: "100%" },
  center: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontSize: 15, color: C.textMuted, fontFamily: "'Inter', -apple-system, sans-serif" },
};
