import { useState } from "react";
import { supabase } from "./supabase";
export default function Auth({ onAuth }) {
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [name, setName] = useState("");
 const [mode, setMode] = useState("signin");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");
 async function handleSubmit() {
   setLoading(true);
   setError("");
   if (mode === "signup") {
     const { data, error } = await supabase.auth.signUp({ email, password });
     if (error) { setError(error.message); setLoading(false); return; }
     await supabase.from("profiles").insert({ id: data.user.id, full_name: name });
   } else {
     const { error } = await supabase.auth.signInWithPassword({ email, password });
     if (error) { setError(error.message); setLoading(false); return; }
   }
   setLoading(false);
   onAuth();
 }
 return (
<div style={styles.shell}>
<div style={styles.card}>
<h1 style={styles.wordmark}>Qumulus<span style={styles.ai}>AI</span></h1>
<p style={styles.tagline}>Workforce OS</p>
<div style={styles.tabs}>
<button style={{...styles.tab, ...(mode === "signin" ? styles.tabActive : {})}} onClick={() => setMode("signin")}>Sign In</button>
<button style={{...styles.tab, ...(mode === "signup" ? styles.tabActive : {})}} onClick={() => setMode("signup")}>Sign Up</button>
</div>
       {mode === "signup" && (
<input style={styles.input} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
       )}
<input style={styles.input} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
<input style={styles.input} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
       {error && <p style={styles.error}>{error}</p>}
<button style={styles.btn} onClick={handleSubmit} disabled={loading}>
         {loading ? "Loading…" : mode === "signin" ? "Sign In" : "Create Account"}
</button>
</div>
</div>
 );
}
const styles = {
 shell: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0F" },
 card: { background: "#111118", border: "1px solid #1E1E2E", borderRadius: 16, padding: 48, width: 360, display: "flex", flexDirection: "column", gap: 16 },
 wordmark: { fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "#E8E8F0", margin: 0, textAlign: "center" },
 ai: { color: "#7B61FF" },
 tagline: { fontSize: 13, color: "#6B6B80", textAlign: "center", margin: 0 },
 tabs: { display: "flex", gap: 8, background: "#0A0A0F", borderRadius: 8, padding: 4 },
 tab: { flex: 1, padding: "8px 0", border: "none", borderRadius: 6, background: "transparent", color: "#6B6B80", fontSize: 13, fontWeight: 600, cursor: "pointer" },
 tabActive: { background: "#1A1530", color: "#7B61FF" },
 input: { background: "#0A0A0F", border: "1px solid #1E1E2E", borderRadius: 8, padding: "12px 14px", color: "#E8E8F0", fontSize: 14, outline: "none" },
 btn: { background: "#7B61FF", border: "none", borderRadius: 8, padding: "12px 0", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 },
 error: { color: "#F87171", fontSize: 13, margin: 0 },
};
