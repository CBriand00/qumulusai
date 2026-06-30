import { useState, useEffect } from "react";
import { supabase } from "./supabase";
function renderMarkdown(text) {
 if (!text) return null;
 const lines = text.split("\n");
 const elements = [];
 let tableRows = [];
 let inTable = false;
 function flushTable(key) {
   if (tableRows.length === 0) return;
   const [headerRow, , ...bodyRows] = tableRows;
   elements.push(
<table key={`table-${key}`} style={styles.table}>
<thead>
<tr>
           {headerRow.map((cell, i) => (
<th key={i} style={styles.th}>{cell.trim()}</th>
           ))}
</tr>
</thead>
<tbody>
         {bodyRows.map((row, ri) => (
<tr key={ri}>
             {row.map((cell, ci) => (
<td key={ci} style={styles.td}>{formatInline(cell.trim())}</td>
             ))}
</tr>
         ))}
</tbody>
</table>
   );
   tableRows = [];
   inTable = false;
 }
 function formatInline(str) {
   const parts = str.split(/(\*\*[^*]+\*\*)/g);
   return parts.map((part, i) => {
     if (part.startsWith("**") && part.endsWith("**")) {
       return <strong key={i}>{part.slice(2, -2)}</strong>;
     }
     return part;
   });
 }
 lines.forEach((line, idx) => {
   const trimmed = line.trim();
   if (trimmed.startsWith("|")) {
     inTable = true;
     const cells = trimmed.split("|").filter((c, i, arr) => i !== 0 && i !== arr.length - 1);
     tableRows.push(cells);
     return;
   } else if (inTable) {
     flushTable(idx);
   }
   if (trimmed === "---") {
     elements.push(<hr key={idx} style={styles.hr} />);
   } else if (trimmed.startsWith("#### ")) {
     elements.push(<h4 key={idx} style={styles.h4}>{formatInline(trimmed.slice(5))}</h4>);
   } else if (trimmed.startsWith("### ")) {
     elements.push(<h3 key={idx} style={styles.h3}>{formatInline(trimmed.slice(4))}</h3>);
   } else if (trimmed.startsWith("## ")) {
     elements.push(<h2 key={idx} style={styles.h2}>{formatInline(trimmed.slice(3))}</h2>);
   } else if (trimmed.startsWith("# ")) {
     elements.push(<h1 key={idx} style={styles.h1}>{formatInline(trimmed.slice(2))}</h1>);
   } else if (trimmed === "") {
     elements.push(<div key={idx} style={{ height: 8 }} />);
   } else {
     elements.push(<p key={idx} style={styles.p}>{formatInline(trimmed)}</p>);
   }
 });
 flushTable("end");
 return elements;
}
export default function OfferSigning({ token }) {
 const [offer, setOffer] = useState(null);
 const [signature, setSignature] = useState("");
 const [signing, setSigning] = useState(false);
 const [signed, setSigned] = useState(false);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 useEffect(() => {
   async function loadOffer() {
     const { data, error } = await supabase
       .from("offers")
       .select("*")
       .eq("signing_token", token)
       .single();
     if (error || !data) setError("Offer not found.");
     else if (data.signed_at) setSigned(true);
     else setOffer(data);
     setLoading(false);
   }
   if (token) loadOffer();
 }, [token]);
 async function handleSign() {
   if (!signature.trim()) return;
   setSigning(true);
   await supabase.from("offers").update({
     signature,
     signed_at: new Date().toISOString(),
     status: "signed"
   }).eq("signing_token", token);
   const onboardingToken = crypto.randomUUID();
   await supabase.from("employees").insert({
     full_name: offer.candidate_name,
     email: offer.candidate_email,
     role_title: offer.role,
     application_id: offer.application_id,
     status: "active",
     start_date: offer.start_date || new Date().toISOString().slice(0, 10),
     onboarding_token: onboardingToken,
   });
   const onboardLink = `https://qumulusai.vercel.app?onboard=${onboardingToken}`;
   await supabase.functions.invoke("send-offer-email", {
     body: {
       candidateEmail: offer.candidate_email,
       candidateName: offer.candidate_name,
       role: offer.role,
       signingLink: onboardLink,
       subject: "Complete Your New Hire Documents — QumulusAI",
       bodyText: `Welcome to QumulusAI, ${offer.candidate_name}! Please complete your new hire documents (W-4, Direct Deposit, I-9) by clicking the link below. This should take about 5 minutes.`,
     },
   });
   setSigning(false);
   setSigned(true);
 }
 if (loading) return <div style={styles.center}>Loading your offer letter…</div>;
 if (error) return <div style={styles.center}>{error}</div>;
 if (signed) return (
<div style={styles.center}>
<div style={styles.successCard}>
<div style={styles.checkmark}>✓</div>
<h2 style={styles.successTitle}>Offer Accepted!</h2>
<p style={styles.successSub}>Welcome to QumulusAI! Your onboarding information will be sent shortly.</p>
</div>
</div>
 );
 const compRows = [
   { label: "Salary", value: offer.salary ? `$${offer.salary}` : null },
   { label: "Annual Bonus", value: offer.bonus },
   { label: "RSU Grant", value: offer.rsu },
   { label: "Sign-On Bonus", value: offer.sign_on_bonus },
   { label: "Relocation Assistance", value: offer.relocation },
 ].filter(row => row.value);
 return (
<div style={styles.shell}>
<div style={styles.header}>
<h1 style={styles.wordmark}>Qumulus<span style={styles.ai}>AI</span></h1>
<p style={styles.subtitle}>Offer Letter</p>
</div>
<div style={styles.content}>
<div style={styles.card}>
<h2 style={styles.name}>{offer.candidate_name}</h2>
<p style={styles.role}>{offer.role} · {offer.department}</p>
<div style={styles.details}>
           {compRows.map((row, i) => (
<div key={i} style={styles.detailRow}>
<span style={styles.detailLabel}>{row.label}</span>
<span style={styles.detailValue}>{row.value}</span>
</div>
           ))}
<div style={styles.detailRow}>
<span style={styles.detailLabel}>Start Date</span>
<span style={styles.detailValue}>
               {offer.start_date
                 ? new Date(offer.start_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                 : "—"}
</span>
</div>
</div>
</div>
<div style={styles.card}>
<h3 style={styles.cardTitle}>Offer Letter</h3>
<div style={styles.letter}>{renderMarkdown(offer.letter)}</div>
</div>
<div style={styles.card}>
<h3 style={styles.cardTitle}>Sign Your Offer</h3>
<p style={styles.signNote}>By typing your full name below you are electronically signing this offer letter.</p>
<input
           style={styles.signInput}
           placeholder="Type your full name to sign"
           value={signature}
           onChange={e => setSignature(e.target.value)}
         />
<button style={styles.signBtn} onClick={handleSign} disabled={signing || !signature.trim()}>
           {signing ? "Signing…" : "Accept Offer & Sign"}
</button>
</div>
</div>
</div>
 );
}
const styles = {
 shell: { minHeight: "100vh", background: "#F7F8FA", color: "#0F172A", fontFamily: "'Inter', -apple-system, sans-serif" },
 center: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F8FA", color: "#0F172A", fontFamily: "'Inter', -apple-system, sans-serif" },
 header: { padding: "24px 32px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 16, background: "#fff" },
 wordmark: { fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: "#0A2540" },
 ai: { color: "#2563EB" },
 subtitle: { fontSize: 13, color: "#64748B", margin: 0 },
 content: { maxWidth: 720, margin: "0 auto", padding: "40px 32px", display: "flex", flexDirection: "column", gap: 24 },
 card: { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
 name: { fontSize: 24, fontWeight: 700, margin: "0 0 4px", color: "#0F172A" },
 role: { fontSize: 15, color: "#2563EB", margin: "0 0 20px", fontWeight: 500 },
 details: { display: "flex", flexDirection: "column", gap: 0 },
 detailRow: { display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #F1F5F9" },
 detailLabel: { color: "#64748B", fontSize: 14 },
 detailValue: { color: "#0F172A", fontSize: 14, fontWeight: 600 },
 cardTitle: { fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: "#0F172A" },
 letter: { fontSize: 14.5, lineHeight: 1.75, color: "#334155" },
 h1: { fontSize: 20, fontWeight: 700, color: "#0F172A", margin: "16px 0 8px" },
 h2: { fontSize: 17, fontWeight: 700, color: "#0F172A", margin: "20px 0 8px" },
 h3: { fontSize: 15.5, fontWeight: 700, color: "#0F172A", margin: "18px 0 6px" },
 h4: { fontSize: 14.5, fontWeight: 700, color: "#0F172A", margin: "14px 0 4px" },
 p: { margin: "0 0 4px" },
 hr: { border: "none", borderTop: "1px solid #E5E7EB", margin: "16px 0" },
 table: { width: "100%", borderCollapse: "collapse", margin: "12px 0 16px", fontSize: 13.5 },
 th: { textAlign: "left", padding: "8px 12px", background: "#F8FAFC", borderBottom: "2px solid #E5E7EB", color: "#0F172A", fontWeight: 700 },
 td: { padding: "8px 12px", borderBottom: "1px solid #F1F5F9", color: "#334155" },
 signNote: { fontSize: 13, color: "#64748B", margin: "0 0 16px" },
 signInput: { width: "100%", boxSizing: "border-box", background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, padding: "12px 14px", color: "#0F172A", fontSize: 16, fontStyle: "italic", outline: "none", marginBottom: 12 },
 signBtn: { width: "100%", background: "#0A2540", border: "none", borderRadius: 8, padding: "14px 0", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" },
 successCard: { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: 48, textAlign: "center", maxWidth: 400, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
 checkmark: { fontSize: 48, color: "#16A34A", marginBottom: 16 },
 successTitle: { fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#0F172A" },
 successSub: { fontSize: 14, color: "#64748B", margin: 0 },
};
