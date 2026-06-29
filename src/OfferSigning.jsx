import { useState, useEffect } from "react";

import { supabase } from "./supabase";

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
<div style={styles.detailRow}>
<span style={styles.detailLabel}>Salary</span>
<span style={styles.detailValue}>{offer.salary}</span>
</div>
<div style={styles.detailRow}>
<span style={styles.detailLabel}>Start Date</span>
<span style={styles.detailValue}>{new Date(offer.start_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
</div>
</div>
</div>
<div style={styles.card}>
<h3 style={styles.cardTitle}>Offer Letter</h3>
<div style={styles.letter}>{offer.letter}</div>
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

  shell: { minHeight: "100vh", background: "#0A0A0F", color: "#E8E8F0", fontFamily: "'Inter', sans-serif" },

  center: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0F", color: "#E8E8F0", fontFamily: "'Inter', sans-serif" },

  header: { padding: "24px 32px", borderBottom: "1px solid #1E1E2E", display: "flex", alignItems: "center", gap: 16 },

  wordmark: { fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" },

  ai: { color: "#7B61FF" },

  subtitle: { fontSize: 13, color: "#6B6B80", margin: 0 },

  content: { maxWidth: 720, margin: "0 auto", padding: "40px 32px", display: "flex", flexDirection: "column", gap: 24 },

  card: { background: "#111118", border: "1px solid #1E1E2E", borderRadius: 12, padding: 24 },

  name: { fontSize: 24, fontWeight: 700, margin: "0 0 4px" },

  role: { fontSize: 15, color: "#7B61FF", margin: "0 0 20px" },

  details: { display: "flex", flexDirection: "column", gap: 12 },

  detailRow: { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1E1E2E" },

  detailLabel: { color: "#6B6B80", fontSize: 14 },

  detailValue: { color: "#E8E8F0", fontSize: 14, fontWeight: 600 },

  cardTitle: { fontSize: 16, fontWeight: 700, margin: "0 0 16px" },

  letter: { fontSize: 14, lineHeight: 1.8, color: "#C0C0D0", whiteSpace: "pre-wrap" },

  signNote: { fontSize: 13, color: "#6B6B80", margin: "0 0 16px" },

  signInput: { width: "100%", boxSizing: "border-box", background: "#0A0A0F", border: "1px solid #1E1E2E", borderRadius: 8, padding: "12px 14px", color: "#E8E8F0", fontSize: 16, fontStyle: "italic", outline: "none", marginBottom: 12 },

  signBtn: { width: "100%", background: "#7B61FF", border: "none", borderRadius: 8, padding: "14px 0", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" },

  successCard: { background: "#111118", border: "1px solid #1E1E2E", borderRadius: 16, padding: 48, textAlign: "center", maxWidth: 400 },

  checkmark: { fontSize: 48, color: "#22C55E", marginBottom: 16 },

  successTitle: { fontSize: 24, fontWeight: 700, margin: "0 0 8px" },

  successSub: { fontSize: 14, color: "#6B6B80", margin: 0 },

};
Buy styles.ai | Spaceship
Own styles.ai today. Secure checkout and guided transfer support. No hidden fees.
 
