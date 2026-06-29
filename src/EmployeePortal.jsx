import { useState, useEffect } from "react";
import { supabase } from "./supabase";
export default function EmployeePortal({ user }) {
 const [profile, setProfile] = useState(null);
 const [onboarding, setOnboarding] = useState(null);
 const [loading, setLoading] = useState(true);
 useEffect(() => {
   async function load() {
     const { data: prof } = await supabase
       .from("profiles")
       .select("*")
       .eq("id", user.id)
       .single();
     setProfile(prof);
     const { data: ob } = await supabase
       .from("onboarding")
       .select("*")
       .eq("employee_id", user.id)
       .single();
     setOnboarding(ob);
     setLoading(false);
   }
   load();
 }, [user]);
 if (loading) return <div style={styles.loading}>Loading your portal…</div>;
 return (
<div style={styles.shell}>
<div style={styles.header}>
<h1 style={styles.wordmark}>Qumulus<span style={styles.ai}>AI</span></h1>
<p style={styles.subtitle}>Employee Portal</p>
<button style={styles.signOut} onClick={() => supabase.auth.signOut()}>Sign Out</button>
</div>
<div style={styles.content}>
<div style={styles.welcome}>
<h2 style={styles.welcomeTitle}>Welcome, {profile?.full_name || "New Hire"}! 👋</h2>
<p style={styles.welcomeSub}>{onboarding?.role} · {onboarding?.department}</p>
         {onboarding?.start_date && (
<p style={styles.startDate}>Start Date: {new Date(onboarding.start_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
         )}
</div>
       {onboarding ? (
<>
<div style={styles.card}>
<h3 style={styles.cardTitle}>Your Onboarding Plan</h3>
<div style={styles.plan}>{onboarding.plan}</div>
</div>
<div style={styles.card}>
<h3 style={styles.cardTitle}>Your Checklist</h3>
             {onboarding.checklist?.length > 0 ? (
               onboarding.checklist.map((item, i) => (
<ChecklistItem key={i} item={item} index={i} onboardingId={onboarding.id} checklist={onboarding.checklist} setOnboarding={setOnboarding} />
               ))
             ) : (
<p style={styles.empty}>No checklist items yet. Your HR team will add them soon!</p>
             )}
</div>
</>
       ) : (
<div style={styles.card}>
<h3 style={styles.cardTitle}>Getting Ready...</h3>
<p style={styles.empty}>Your onboarding plan is being prepared. Check back soon!</p>
</div>
       )}
<div style={styles.card}>
<h3 style={styles.cardTitle}>Your Manager</h3>
<p style={styles.managerName}>{onboarding?.manager || "To be assigned"}</p>
</div>
</div>
</div>
 );
}
function ChecklistItem({ item, index, onboardingId, checklist, setOnboarding }) {
 async function toggle() {
   const updated = checklist.map((c, i) => i === index ? { ...c, done: !c.done } : c);
   await supabase.from("onboarding").update({ checklist: updated }).eq("id", onboardingId);
   setOnboarding(prev => ({ ...prev, checklist: updated }));
 }
 return (
<div style={styles.checkItem} onClick={toggle}>
<div style={{ ...styles.checkbox, ...(item.done ? styles.checkboxDone : {}) }}>
       {item.done && <span style={styles.checkmark}>✓</span>}
</div>
<span style={{ ...styles.checkLabel, ...(item.done ? styles.checkLabelDone : {}) }}>{item.label}</span>
</div>
 );
}
const styles = {
 shell: { minHeight: "100vh", background: "#0A0A0F", color: "#E8E8F0", fontFamily: "'Inter', sans-serif" },
 loading: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0F", color: "#E8E8F0" },
 header: { padding: "24px 32px", borderBottom: "1px solid #1E1E2E", display: "flex", alignItems: "center", gap: 16 },
 wordmark: { fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" },
 ai: { color: "#7B61FF" },
 subtitle: { fontSize: 13, color: "#6B6B80", margin: 0, flex: 1 },
 signOut: { background: "none", border: "1px solid #1E1E2E", borderRadius: 6, color: "#6B6B80", fontSize: 12, padding: "6px 14px", cursor: "pointer" },
 content: { maxWidth: 720, margin: "0 auto", padding: "40px 32px", display: "flex", flexDirection: "column", gap: 24 },
 welcome: { background: "#111118", border: "1px solid #1E1E2E", borderRadius: 16, padding: 32 },
 welcomeTitle: { fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" },
 welcomeSub: { fontSize: 16, color: "#7B61FF", margin: "0 0 8px" },
 startDate: { fontSize: 14, color: "#6B6B80", margin: 0 },
 card: { background: "#111118", border: "1px solid #1E1E2E", borderRadius: 12, padding: 24 },
 cardTitle: { fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: "#E8E8F0" },
 plan: { fontSize: 14, lineHeight: 1.8, color: "#C0C0D0", whiteSpace: "pre-wrap" },
 empty: { fontSize: 14, color: "#6B6B80", margin: 0 },
 managerName: { fontSize: 16, fontWeight: 600, margin: 0 },
 checkItem: { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #1E1E2E", cursor: "pointer" },
 checkbox: { width: 20, height: 20, borderRadius: 6, border: "2px solid #1E1E2E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
 checkboxDone: { background: "#7B61FF", borderColor: "#7B61FF" },
 checkmark: { color: "#fff", fontSize: 12, fontWeight: 700 },
 checkLabel: { fontSize: 14, color: "#E8E8F0" },
 checkLabelDone: { color: "#6B6B80", textDecoration: "line-through" },
};
