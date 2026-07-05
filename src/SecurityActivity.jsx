import { useState } from "react";
import { supabase } from "./supabase";
import { getLoginHistory } from "./Auth";
import { useBreakpoint } from "./useBreakpoint";

const C = {
  bg: "#F0F2F7", bgCard: "#fff", text: "#0D1117", textMid: "#3D4B5C",
  textMuted: "#7E8FA3", border: "#DDE3ED", brand: "#2563EB",
  success: "#059669", rose: "#DC2626", amber: "#D97706", emerald: "#059669",
};

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
      <span style={{ color: C.textMuted }}>{label}</span>
      <span style={{ color: valueColor || C.text, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function SectionCard({ title, children, style }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22, marginBottom: 14, ...style }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

export default function SecurityActivity({ user }) {
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [signedOutAll,  setSignedOutAll]  = useState(false);
  const { isMobile } = useBreakpoint();
  const history = getLoginHistory();

  async function handleSignOutAll() {
    setSigningOutAll(true);
    await supabase.auth.signOut({ scope: "global" });
    setSigningOutAll(false);
    setSignedOutAll(true);
  }

  const { browser, os } = (() => {
    const ua = navigator.userAgent;
    return {
      browser: ua.includes("Edg/") ? "Edge" : ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "Browser",
      os: /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "macOS" : /Win/.test(ua) ? "Windows" : "Unknown OS",
    };
  })();

  return (
    <div>
      <div style={{ marginBottom: 26 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.text, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Security Activity</h2>
        <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>Monitor your account access, devices, and security events.</p>
      </div>

      {/* Active session */}
      <SectionCard title="Active Session">
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3 }}>{user?.email}</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>{browser} on {os} · Signed in now</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.success, boxShadow: `0 0 6px ${C.success}80` }} />
            <span style={{ fontSize: 12, color: C.success, fontWeight: 700 }}>Active now</span>
          </div>
        </div>
      </SectionCard>

      {/* Login history */}
      <SectionCard title="Recent Login History">
        {history.length === 0 ? (
          <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "20px 0" }}>
            No login history recorded. History is captured from your next sign-in.
          </div>
        ) : (
          <div>
            {history.map((entry, i) => (
              <div
                key={i}
                style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", padding: "13px 0", borderBottom: i < history.length - 1 ? `1px solid ${C.border}` : "none", gap: isMobile ? 6 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7 }}>
                    {entry.browser} on {entry.os}
                    {entry.isNewDevice && (
                      <span style={{ background: "#FEF3C7", color: "#D97706", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.04em" }}>
                        New Device
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{entry.date} at {entry.time}</div>
                </div>
                <div style={{ fontSize: 12, color: C.success, fontWeight: 700, alignSelf: isMobile ? "flex-start" : "center", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color: C.success }}>✓</span> Successful
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Security features */}
      <SectionCard title="Security Features">
        {[
          { label: "End-to-end encryption",   status: "Active",      color: C.success },
          { label: "Device recognition",       status: "Active",      color: C.success },
          { label: "Session monitoring",       status: "Active",      color: C.success },
          { label: "Audit logging",            status: "Active",      color: C.success },
          { label: "Failed login detection",   status: "Active",      color: C.success },
          { label: "Multi-factor Authentication", status: "Coming Soon", color: C.amber },
          { label: "Single Sign-On (SAML/OAuth)", status: "Coming Soon", color: C.amber },
          { label: "Conditional Access Policies", status: "Coming Soon", color: C.amber },
        ].map((f, i, arr) => (
          <div key={f.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none", fontSize: 13 }}>
            <span style={{ color: C.text }}>{f.label}</span>
            <span style={{ color: f.color, fontWeight: 700, fontSize: 12 }}>{f.status}</span>
          </div>
        ))}
      </SectionCard>

      {/* RBAC architecture note */}
      <SectionCard title="Enterprise Access Control" style={{ background: "#F8FAFC" }}>
        <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 14px", lineHeight: 1.6 }}>
          QumulusAI is architected for enterprise access control. The following capabilities are available for activation:
        </p>
        {[
          { label: "Role-Based Access Control (RBAC)", note: "Profile roles enforced at query level" },
          { label: "Department-level permissions",      note: "Via organization policy rules" },
          { label: "Executive permissions",             note: "CEO/executive role in profiles table" },
          { label: "Admin impersonation (audited)",     note: "Logged to audit trail" },
          { label: "Multi-tenancy",                     note: "Organization ID on every record" },
          { label: "Security alerts",                   note: "Via webhook + email triggers" },
        ].map(f => (
          <div key={f.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}`, gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.label}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{f.note}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, background: "#EEF2FF", color: C.brand, borderRadius: 4, padding: "3px 7px", letterSpacing: "0.04em", flexShrink: 0 }}>Ready</span>
          </div>
        ))}
      </SectionCard>

      {/* Session management */}
      <SectionCard title="Session Management">
        <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 18px", lineHeight: 1.6 }}>
          Immediately invalidate all active sessions across every device and browser. You will be signed out everywhere and will need to sign back in.
        </p>
        {signedOutAll ? (
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: C.success, fontWeight: 600 }}>
            ✓ All sessions have been signed out.
          </div>
        ) : (
          <button
            onClick={handleSignOutAll}
            disabled={signingOutAll}
            style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "12px 20px", color: C.rose, fontSize: 13, fontWeight: 700, cursor: signingOutAll ? "default" : "pointer", fontFamily: "inherit", minHeight: 44, opacity: signingOutAll ? 0.7 : 1, transition: "opacity 0.15s" }}>
            {signingOutAll ? "Signing out all sessions…" : "⚡ Sign Out All Devices"}
          </button>
        )}
      </SectionCard>
    </div>
  );
}
