import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { useBreakpoint } from "./useBreakpoint";
import { brand } from "./brand";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:          "#07090F",
  bgCard:      "#0D1117",
  bgInput:     "#060810",
  bgInputFocus:"#080B14",
  border:      "#1C2030",
  borderFocus: "#2563EB",
  text:        "#E2E8F4",
  textSub:     "#94A3B8",
  textMuted:   "#4B5A6E",
  brand:       "#2563EB",
  brandHov:    "#1D4ED8",
  success:     "#10B981",
  successBg:   "#10B98114",
  error:       "#EF4444",
  errorBg:     "#EF444412",
  navy:        "#0A1628",
  navyBorder:  "#1E3A5F",
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(pwd) {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8)  s++;
  if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[a-z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

const STRENGTH_LABEL = ["", "Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
const STRENGTH_COLOR = ["", "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#10B981", "#10B981"];

function friendlyError(err) {
  const msg = typeof err === "string" ? err : err?.message || "";
  if (msg.includes("Invalid login credentials")) return "Incorrect email or password. Please try again.";
  if (msg.includes("Email not confirmed"))       return "Please confirm your email address before signing in.";
  if (msg.includes("User already registered"))   return "An account with this email already exists. Try signing in.";
  if (msg.includes("Password should be at least")) return "Password must be at least 8 characters.";
  if (msg.includes("rate limit") || msg.includes("too many")) return "Too many attempts. Please wait a few minutes before trying again.";
  if (msg.includes("For security purposes")) return "For security, please wait a moment before trying again.";
  if (msg.includes("network") || msg.includes("fetch")) return "Connection error. Please check your internet connection.";
  return msg || "Something went wrong. Please try again.";
}

// ─── Device / Login Tracking ──────────────────────────────────────────────────
function getDeviceInfo() {
  const ua = navigator.userAgent;
  const browser =
    ua.includes("Edg/")    ? "Edge"    :
    ua.includes("Chrome")  ? "Chrome"  :
    ua.includes("Firefox") ? "Firefox" :
    ua.includes("Safari")  ? "Safari"  : "Browser";
  const os =
    /iPhone|iPad/.test(ua) ? "iOS"     :
    /Android/.test(ua)     ? "Android" :
    /Mac/.test(ua)         ? "macOS"   :
    /Win/.test(ua)         ? "Windows" :
    /Linux/.test(ua)       ? "Linux"   : "Unknown OS";
  const deviceId = btoa(`${screen.width}x${screen.height}|${ua.slice(0, 60)}`).slice(0, 28);
  return { browser, os, deviceId };
}

export function recordLogin(userId, rememberMe = true) {
  const { browser, os, deviceId } = getDeviceInfo();
  const now = new Date();
  const entry = {
    userId, deviceId, browser, os,
    timestamp: now.toISOString(),
    date: now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };

  const history     = JSON.parse(localStorage.getItem("qai_login_history") || "[]");
  const knownDevices = JSON.parse(localStorage.getItem("qai_known_devices") || "[]");
  const isNewDevice = !knownDevices.includes(deviceId);
  if (isNewDevice) {
    knownDevices.push(deviceId);
    localStorage.setItem("qai_known_devices", JSON.stringify(knownDevices));
  }

  const currentEntry = { ...entry, isNewDevice };
  // Store previous login (what we show as "your last login was…")
  if (history.length > 0) {
    localStorage.setItem("qai_previous_login", JSON.stringify(history[0]));
  }
  history.unshift(currentEntry);
  localStorage.setItem("qai_login_history", JSON.stringify(history.slice(0, 20)));
  localStorage.setItem("qai_last_login", JSON.stringify(currentEntry));

  // Remember-me handling — session-only if false
  if (!rememberMe) {
    localStorage.setItem("qai_no_persist", "1");
    sessionStorage.setItem("qai_active_session", "1");
  } else {
    localStorage.removeItem("qai_no_persist");
    sessionStorage.removeItem("qai_active_session");
  }

  // Signal to App that this is a fresh login (show banner)
  sessionStorage.setItem("qai_fresh_login", "1");

  return isNewDevice;
}

export function getLastLogin()     { const s = localStorage.getItem("qai_last_login");     return s ? JSON.parse(s) : null; }
export function getPreviousLogin() { const s = localStorage.getItem("qai_previous_login"); return s ? JSON.parse(s) : null; }
export function getLoginHistory()  { return JSON.parse(localStorage.getItem("qai_login_history") || "[]"); }

// ─── Eye Icon ─────────────────────────────────────────────────────────────────
function EyeIcon({ visible }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {visible ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

// ─── Input Field ─────────────────────────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, error, autoComplete, rightSlot, onKeyDown }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && (
        <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: C.textSub, letterSpacing: "0.03em", marginBottom: 7 }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <input
          type={type}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: focused ? C.bgInputFocus : C.bgInput,
            border: `1px solid ${error ? C.error : focused ? C.borderFocus : C.border}`,
            borderRadius: 9,
            padding: rightSlot ? "13px 44px 13px 14px" : "13px 14px",
            color: C.text,
            fontSize: 14,
            outline: "none",
            fontFamily: "inherit",
            minHeight: 48,
            transition: "border-color 0.15s, background 0.15s",
            boxShadow: focused ? `0 0 0 3px ${C.brand}1A` : "none",
          }}
        />
        {rightSlot && (
          <div style={{ position: "absolute", right: 0, top: 0, height: "100%", display: "flex", alignItems: "center", paddingRight: 14, color: C.textSub }}>
            {rightSlot}
          </div>
        )}
      </div>
      {error && (
        <div style={{ fontSize: 12, color: C.error, marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
          <span>⚠</span> {error}
        </div>
      )}
    </div>
  );
}

// ─── Password Strength Bar ────────────────────────────────────────────────────
function StrengthBar({ password }) {
  const s = getPasswordStrength(password);
  if (!password) return null;
  const color = STRENGTH_COLOR[s] || STRENGTH_COLOR[1];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= s ? color : C.border, transition: "background 0.2s" }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color, fontWeight: 500 }}>Password strength: {STRENGTH_LABEL[s]}</div>
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function Checkbox({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
      <div
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={e => { if (e.key === " " || e.key === "Enter") onChange(!checked); }}
        style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${checked ? C.brand : C.border}`, background: checked ? C.brand : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s", outline: "none" }}>
        {checked && <span style={{ color: "#fff", fontSize: 10, fontWeight: 800, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: 13, color: C.textSub }}>{label}</span>
    </label>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────
function Alert({ type, children }) {
  const isError   = type === "error";
  const isSuccess = type === "success";
  return (
    <div style={{
      background: isError ? C.errorBg : isSuccess ? C.successBg : `${C.brand}10`,
      border: `1px solid ${isError ? `${C.error}30` : isSuccess ? `${C.success}30` : `${C.brand}30`}`,
      borderRadius: 8,
      padding: "11px 14px",
      fontSize: 13,
      color: isError ? C.error : isSuccess ? C.success : C.textSub,
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
      lineHeight: 1.5,
    }}>
      <span style={{ flexShrink: 0 }}>{isError ? "⚠" : isSuccess ? "✓" : "ℹ"}</span>
      <span>{children}</span>
    </div>
  );
}

// ─── Primary Button ───────────────────────────────────────────────────────────
function PrimaryBtn({ onClick, disabled, loading, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: "100%",
        background: disabled && !loading ? `${C.brand}60` : C.brand,
        border: "none",
        borderRadius: 9,
        padding: "14px 0",
        color: "#fff",
        fontSize: 14,
        fontWeight: 700,
        cursor: loading || disabled ? "default" : "pointer",
        opacity: loading ? 0.75 : 1,
        fontFamily: "inherit",
        minHeight: 50,
        transition: "opacity 0.15s, background 0.15s",
        letterSpacing: "-0.01em",
      }}>
      {children}
    </button>
  );
}

// ─── Ghost Link Button ────────────────────────────────────────────────────────
function GhostBtn({ onClick, children, style }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", color: C.brand, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 13, padding: 0, ...style }}>
      {children}
    </button>
  );
}

// ─── Enterprise Security Card ─────────────────────────────────────────────────
function EnterpriseSecurityCard() {
  const live = [
    "End-to-end encrypted authentication",
    "Secure AI processing",
    "Audit logging",
    "Device recognition",
    "Session monitoring",
    "Failed login detection",
  ];
  const soon = [
    "Multi-factor Authentication",
    "Single Sign-On (SAML/OAuth)",
    "Conditional Access Policies",
  ];
  return (
    <div style={{
      background: `linear-gradient(145deg, ${C.navy} 0%, #0B1A2E 100%)`,
      border: `1px solid ${C.navyBorder}`,
      borderRadius: 14,
      padding: "22px 24px",
      marginTop: 18,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
        <div style={{ width: 32, height: 32, background: `${C.brand}1A`, border: `1px solid ${C.brand}35`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 15 }}>⚔</span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>Enterprise Security</div>
          <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Production Grade</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 18px", lineHeight: 1.6 }}>
        Designed for enterprise organizations that require secure AI-powered workforce management.
      </p>

      {/* Live features */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {live.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#10B981", fontSize: 11, flexShrink: 0, width: 14, textAlign: "center" }}>✓</span>
            <span style={{ fontSize: 12, color: "#8BA4BE" }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: `1px solid ${C.navyBorder}`, margin: "14px 0" }} />

      {/* Coming Soon */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {soon.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: C.textMuted, fontSize: 11, flexShrink: 0, width: 14, textAlign: "center" }}>⏳</span>
            <span style={{ fontSize: 12, color: C.textMuted, flex: 1 }}>{f}</span>
            <span style={{ fontSize: 9, fontWeight: 700, background: "#1A2F4A", color: "#4B8FCC", borderRadius: 4, padding: "2px 7px", letterSpacing: "0.05em", flexShrink: 0, whiteSpace: "nowrap" }}>
              Coming Soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Auth Component ──────────────────────────────────────────────────────
export default function Auth({ onAuth }) {
  const { isMobile } = useBreakpoint();

  // Which view is active
  const [view, setView] = useState("signin"); // signin | signup | forgot | check-email | reset

  // Field state
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name,            setName]            = useState("");
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [rememberMe,      setRememberMe]      = useState(true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});
  const [success, setSuccess] = useState("");

  // Detect password-reset token in URL hash (Supabase appends #access_token=...&type=recovery)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || (hash.includes("access_token") && hash.includes("type="))) {
      setView("reset");
    }
  }, []);

  function clearErrors() { setErrors({}); setSuccess(""); }

  function switchView(v) { clearErrors(); setView(v); }

  // ── Inline validation ──────────────────────────────────────────────────────
  function validate(fields) {
    const errs = {};
    if ("email" in fields && !validateEmail(fields.email))
      errs.email = "Please enter a valid email address.";
    if ("name" in fields && !fields.name.trim())
      errs.name = "Please enter your full name.";
    if ("password" in fields) {
      if (fields.password.length < 8)
        errs.password = "Password must be at least 8 characters.";
      else if (view === "signup" && getPasswordStrength(fields.password) < 3)
        errs.password = "Password is too weak. Add uppercase letters, numbers, or symbols.";
    }
    if ("confirmPassword" in fields && fields.password !== fields.confirmPassword)
      errs.confirmPassword = "Passwords do not match.";
    return errs;
  }

  // ── Sign In ────────────────────────────────────────────────────────────────
  async function handleSignIn() {
    const errs = validate({ email, password });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); clearErrors();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErrors({ form: friendlyError(error) }); setLoading(false); return; }
    recordLogin(data.user.id, rememberMe);
    setLoading(false);
    onAuth();
  }

  // ── Sign Up ────────────────────────────────────────────────────────────────
  async function handleSignUp() {
    const errs = validate({ name, email, password, confirmPassword });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); clearErrors();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) { setErrors({ form: friendlyError(error) }); setLoading(false); return; }
    if (data?.user?.id) {
      await supabase.from("profiles").upsert({ id: data.user.id, full_name: name }).catch(() => {});
    }
    setLoading(false);
    setSuccess("Account created! Please check your email to confirm your address, then sign in.");
    setTimeout(() => { switchView("signin"); }, 5000);
  }

  // ── Forgot Password ────────────────────────────────────────────────────────
  async function handleForgotPassword() {
    const errs = validate({ email });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); clearErrors();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    });
    if (error) { setErrors({ form: friendlyError(error) }); setLoading(false); return; }
    setLoading(false);
    setView("check-email");
  }

  // ── Password Reset (from email link) ──────────────────────────────────────
  async function handlePasswordReset() {
    const errs = validate({ password, confirmPassword });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); clearErrors();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setErrors({ form: friendlyError(error) }); setLoading(false); return; }
    setLoading(false);
    setSuccess("Password updated successfully! Redirecting you to sign in…");
    // Clear the hash so it doesn't re-trigger the reset flow on refresh
    history.replaceState(null, "", window.location.pathname + window.location.search);
    setTimeout(() => { switchView("signin"); }, 2500);
  }

  // ── Enter key handler ──────────────────────────────────────────────────────
  function onKey(e) {
    if (e.key !== "Enter" || loading) return;
    if (view === "signin")  handleSignIn();
    if (view === "signup")  handleSignUp();
    if (view === "forgot")  handleForgotPassword();
    if (view === "reset")   handlePasswordReset();
  }

  const eyeToggle = (show, toggle) => (
    <button
      type="button"
      onClick={toggle}
      aria-label={show ? "Hide password" : "Show password"}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", color: C.textSub, minWidth: 30, minHeight: 30, justifyContent: "center" }}>
      <EyeIcon visible={show} />
    </button>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: isMobile ? "20px 16px 40px" : "40px 24px",
      boxSizing: "border-box",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* ── Wordmark ── */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, background: `${C.brand}1A`, border: `1px solid ${C.brand}35`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: C.brand, fontWeight: 900, fontSize: 16 }}>{brand.mark ?? brand.name.charAt(0)}</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: "-0.04em", margin: 0 }}>
              {brand.wordmark.lead}{brand.wordmark.body}<span style={{ color: C.brand }}>{brand.wordmark.tail}</span>
            </h1>
          </div>
          <p style={{ fontSize: 11, color: C.textMuted, margin: 0, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
            {brand.tagline}
          </p>
        </div>

        {/* ── Card ── */}
        <div style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: isMobile ? "28px 20px 32px" : "36px 32px 40px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)",
        }}>

          {/* ══ SIGN IN ══ */}
          {view === "signin" && (
            <>
              <div style={{ marginBottom: 26 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "0 0 5px", letterSpacing: "-0.02em" }}>Welcome back</h2>
                <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Sign in to your {brand.name} workspace</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" error={errors.email} onKeyDown={onKey} />

                <div>
                  <Field
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    error={errors.password}
                    onKeyDown={onKey}
                    rightSlot={eyeToggle(showPassword, () => setShowPassword(v => !v))}
                  />
                  <div style={{ textAlign: "right", marginTop: 7 }}>
                    <GhostBtn onClick={() => switchView("forgot")}>Forgot password?</GhostBtn>
                  </div>
                </div>

                <Checkbox checked={rememberMe} onChange={setRememberMe} label="Keep me signed in" />

                {errors.form && <Alert type="error">{errors.form}</Alert>}
                {success && <Alert type="success">{success}</Alert>}

                <div style={{ marginTop: 4 }}>
                  <PrimaryBtn onClick={handleSignIn} loading={loading}>
                    {loading ? "Signing in…" : "Sign In"}
                  </PrimaryBtn>
                </div>
              </div>

              <p style={{ textAlign: "center", margin: "22px 0 0", fontSize: 13, color: C.textSub }}>
                Don't have an account?{" "}
                <GhostBtn onClick={() => switchView("signup")}>Create account</GhostBtn>
              </p>
            </>
          )}

          {/* ══ SIGN UP ══ */}
          {view === "signup" && (
            <>
              <div style={{ marginBottom: 26 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "0 0 5px", letterSpacing: "-0.02em" }}>Create your account</h2>
                <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Join the {brand.name} enterprise platform</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="Full name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" autoComplete="name" error={errors.name} onKeyDown={onKey} />
                <Field label="Work email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" autoComplete="email" error={errors.email} onKeyDown={onKey} />
                <div>
                  <Field
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    error={errors.password}
                    onKeyDown={onKey}
                    rightSlot={eyeToggle(showPassword, () => setShowPassword(v => !v))}
                  />
                  <StrengthBar password={password} />
                </div>
                <Field
                  label="Confirm password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  error={errors.confirmPassword}
                  onKeyDown={onKey}
                  rightSlot={eyeToggle(showConfirm, () => setShowConfirm(v => !v))}
                />

                {errors.form && <Alert type="error">{errors.form}</Alert>}
                {success && <Alert type="success">{success}</Alert>}

                <div style={{ marginTop: 4 }}>
                  <PrimaryBtn onClick={handleSignUp} loading={loading}>
                    {loading ? "Creating account…" : "Create Account"}
                  </PrimaryBtn>
                </div>
              </div>

              <p style={{ textAlign: "center", margin: "22px 0 0", fontSize: 13, color: C.textSub }}>
                Already have an account?{" "}
                <GhostBtn onClick={() => switchView("signin")}>Sign in</GhostBtn>
              </p>
            </>
          )}

          {/* ══ FORGOT PASSWORD ══ */}
          {view === "forgot" && (
            <>
              <div style={{ marginBottom: 26 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "0 0 5px", letterSpacing: "-0.02em" }}>Reset your password</h2>
                <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Enter your email and we'll send a secure reset link.</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" error={errors.email} onKeyDown={onKey} />

                {errors.form && <Alert type="error">{errors.form}</Alert>}

                <div style={{ marginTop: 4 }}>
                  <PrimaryBtn onClick={handleForgotPassword} loading={loading}>
                    {loading ? "Sending…" : "Send Reset Link"}
                  </PrimaryBtn>
                </div>
              </div>

              <p style={{ textAlign: "center", margin: "22px 0 0", fontSize: 13, color: C.textSub }}>
                <GhostBtn onClick={() => switchView("signin")}>← Back to sign in</GhostBtn>
              </p>
            </>
          )}

          {/* ══ CHECK EMAIL ══ */}
          {view === "check-email" && (
            <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
              <div style={{ fontSize: 52, marginBottom: 18, lineHeight: 1 }}>✉</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "0 0 10px", letterSpacing: "-0.02em" }}>Check your email</h2>
              <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.65, margin: "0 0 22px" }}>
                We sent a password reset link to{" "}
                <strong style={{ color: C.text }}>{email}</strong>.
                <br />The link expires in 1 hour.
              </p>
              <Alert type="info">
                <strong>Tip:</strong> If you don't see the email, check your spam or junk folder.
              </Alert>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
                <button
                  onClick={() => { setView("forgot"); clearErrors(); }}
                  style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 0", width: "100%", color: C.textSub, fontSize: 13, cursor: "pointer", fontFamily: "inherit", minHeight: 44 }}>
                  Resend email
                </button>
                <GhostBtn onClick={() => switchView("signin")}>← Back to sign in</GhostBtn>
              </div>
            </div>
          )}

          {/* ══ PASSWORD RESET (from email link) ══ */}
          {view === "reset" && (
            <>
              <div style={{ marginBottom: 26 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "0 0 5px", letterSpacing: "-0.02em" }}>Set new password</h2>
                <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Choose a strong password for your account.</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <Field
                    label="New password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    error={errors.password}
                    onKeyDown={onKey}
                    rightSlot={eyeToggle(showPassword, () => setShowPassword(v => !v))}
                  />
                  <StrengthBar password={password} />
                </div>
                <Field
                  label="Confirm new password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  autoComplete="new-password"
                  error={errors.confirmPassword}
                  onKeyDown={onKey}
                  rightSlot={eyeToggle(showConfirm, () => setShowConfirm(v => !v))}
                />

                {errors.form && <Alert type="error">{errors.form}</Alert>}
                {success && <Alert type="success">{success}</Alert>}

                <div style={{ marginTop: 4 }}>
                  <PrimaryBtn onClick={handlePasswordReset} loading={loading}>
                    {loading ? "Updating password…" : "Update Password"}
                  </PrimaryBtn>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Trust line (sign-in + sign-up only) ── */}
        {(view === "signin" || view === "signup") && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 18, fontSize: 11.5, color: C.textMuted }}>
            <span style={{ fontSize: 12 }}>🔒</span>
            <span>End-to-end encrypted · Audit logged · Enterprise-grade security</span>
          </div>
        )}

        {/* ── Footer ── */}
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: C.textMuted }}>
          © 2026 {brand.name}
        </p>
      </div>
    </div>
  );
}
