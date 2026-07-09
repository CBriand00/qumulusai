import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";
import { brand } from "./brand";

const C = {
  bg: "#F7F8FA", surface: "#FFFFFF", border: "#E5E7EB",
  text: "#0F172A", muted: "#64748B", violet: "#7C3AED",
  emerald: "#059669", rose: "#E11D48", amber: "#D97706",
};

const interviewSys = `You are ${brand.name}'s Interview Intelligence engine. When given interview notes or a transcript, produce a structured debrief. Use these sections:

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

function renderMd(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    const t = line.trim();
    const bold = (s) => s.split(/(\*\*[^*]+\*\*)/).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
    );
    if (t.startsWith("### ")) return <h3 key={i} style={{ fontSize: 15, fontWeight: 700, margin: "14px 0 4px", color: C.text }}>{t.slice(4)}</h3>;
    if (t.startsWith("## "))  return <h2 key={i} style={{ fontSize: 17, fontWeight: 700, margin: "18px 0 6px", color: C.text }}>{t.slice(3)}</h2>;
    if (t === "") return <div key={i} style={{ height: 6 }} />;
    return <p key={i} style={{ margin: "2px 0", fontSize: 14, lineHeight: 1.7, color: "#334155" }}>{bold(t)}</p>;
  });
}

// Pull the headline recommendation out of the debrief for the saved record.
function parseRecommendation(debrief) {
  const m = debrief.match(/OVERALL RECOMMENDATION:\s*\(?\s*([A-Za-z ]+?)\s*\)?\s*(?:\n|$)/i);
  return m ? m[1].trim() : "";
}

export default function InterviewNotetaker() {
  const [candidateName, setCandidateName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [debrief, setDebrief] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const recognitionRef = useRef(null);
  const finalRef = useRef("");        // committed (final) transcript text
  const supported = typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => () => { try { recognitionRef.current?.stop(); } catch { /* noop */ } }, []);

  function toggleRecording() {
    if (recording) {
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
      setRecording(false);
      return;
    }
    if (!supported) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    finalRef.current = transcript ? transcript.trimEnd() + " " : "";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += chunk + " ";
        else interim += chunk;
      }
      setTranscript((finalRef.current + interim).replace(/\s+/g, " ").trimStart());
    };
    rec.onerror = (e) => {
      setError("Mic/transcription error: " + (e.error || "unknown") + ". You can still type or paste the transcript.");
      setRecording(false);
    };
    rec.onend = () => { setRecording(false); };

    recognitionRef.current = rec;
    setError("");
    try { rec.start(); setRecording(true); }
    catch (err) { setError("Couldn't start recording: " + err.message); }
  }

  async function generateDebrief() {
    if (!transcript.trim()) return;
    setGenerating(true);
    setDebrief("");
    setSaved(false);
    setError("");
    const header = [
      candidateName ? `Candidate: ${candidateName}` : "",
      roleTitle ? `Role: ${roleTitle}` : "",
    ].filter(Boolean).join("\n");
    try {
      const { data, error } = await supabase.functions.invoke("ai-query", {
        body: {
          system: interviewSys,
          max_tokens: 1500,
          messages: [{ role: "user", content: `${header}\n\nTranscript / notes:\n${transcript}` }],
        },
      });
      if (error) throw error;
      if (data?.error) {
        setError("AI error: " + (typeof data.error === "string" ? data.error : JSON.stringify(data.error)));
      } else {
        setDebrief(data?.content?.map(b => b.text || "").join("") || "No response.");
      }
    } catch (e) {
      setError("Couldn't reach AI: " + e.message);
    }
    setGenerating(false);
  }

  async function saveDebrief() {
    if (!debrief.trim()) return;
    setSaving(true);
    setError("");
    try {
      const { error } = await supabase.from("interview_notes").insert({
        candidate_name: candidateName || null,
        role_title: roleTitle || null,
        transcript,
        debrief,
        recommendation: parseRecommendation(debrief) || null,
      });
      if (error) throw error;
      setSaved(true);
    } catch (e) {
      setError("Couldn't save: " + e.message);
    }
    setSaving(false);
  }

  const inputStyle = { boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" };

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.violet, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>◇ Interview Notetaker</div>
      <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.7, marginBottom: 14 }}>
        Record the interview for live transcription, or paste notes. {brand.name} produces a structured debrief with competency ratings, a hire recommendation, risks, and follow-ups — and saves it for later comparison.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <input value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="Candidate name" style={{ ...inputStyle, width: "100%" }} />
        <input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="Role" style={{ ...inputStyle, width: "100%" }} />
      </div>

      {/* Record controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <button onClick={toggleRecording} disabled={!supported}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: recording ? C.rose : (supported ? C.violet : C.border),
            border: "none", borderRadius: 8, padding: "10px 18px", color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: supported ? "pointer" : "not-allowed",
            fontFamily: "inherit", opacity: supported ? 1 : 0.7,
          }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#fff", opacity: recording ? 1 : 0.85, animation: recording ? "pulse 1.2s infinite" : "none" }} />
          {recording ? "Stop recording" : "Record interview"}
        </button>
        {recording && <span style={{ fontSize: 12, color: C.rose, fontWeight: 600 }}>● Listening — speak naturally</span>}
        {!supported && <span style={{ fontSize: 12, color: C.muted }}>Live transcription needs Chrome or Edge. You can type or paste the transcript below.</span>}
        <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>
      </div>

      <textarea
        rows={8}
        value={transcript}
        onChange={e => setTranscript(e.target.value)}
        placeholder="Transcript builds here as you record — or paste interview notes / a transcript…"
        style={{ ...inputStyle, width: "100%", resize: "vertical", lineHeight: 1.6, marginBottom: 12 }}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <button onClick={generateDebrief} disabled={generating || !transcript.trim()}
          style={{ background: C.violet, border: "none", borderRadius: 8, padding: "12px 22px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: generating || !transcript.trim() ? "default" : "pointer", opacity: generating || !transcript.trim() ? 0.6 : 1, fontFamily: "inherit" }}>
          {generating ? "◈ Analyzing…" : "✦ Generate Debrief"}
        </button>
        {debrief && !generating && (
          <button onClick={saveDebrief} disabled={saving || saved}
            style={{ background: saved ? "#ECFDF5" : "transparent", border: `1px solid ${saved ? C.emerald : C.border}`, borderRadius: 8, padding: "12px 22px", color: saved ? C.emerald : C.text, fontSize: 14, fontWeight: 700, cursor: saving || saved ? "default" : "pointer", fontFamily: "inherit" }}>
            {saved ? "✓ Saved" : saving ? "Saving…" : "Save debrief"}
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: 13, color: "#DC2626", margin: "6px 0 0" }}>{error}</p>}

      {(generating || debrief) && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.violet}`, borderRadius: 12, padding: 22, marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.violet, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>✦ Structured Debrief</div>
          {generating
            ? <span style={{ color: C.violet, fontWeight: 600, fontSize: 14 }}>◈ Producing the debrief…</span>
            : <div>{renderMd(debrief)}</div>}
        </div>
      )}
    </div>
  );
}
