// ─────────────────────────────────────────────────────────────────────────────
// QumulusAI Design System
// One source of truth: color tokens, spacing scale, radii, shadows, typography,
// and primitive style builders. Import from here everywhere — no ad-hoc values.
// Inspiration: Linear / Stripe / Notion — calm surfaces, deliberate space,
// restrained color, strong hierarchy.
// ─────────────────────────────────────────────────────────────────────────────

export const color = {
  // Surfaces
  bg:        "#F6F7F9",   // app background (softer than legacy #F0F2F7)
  surface:   "#FFFFFF",   // cards
  surfaceAlt:"#FAFBFC",   // subtle inset
  overlay:   "rgba(15,23,42,0.35)",

  // Lines
  border:    "#E9ECF1",   // hairline
  borderStrong:"#DCE0E7",

  // Text
  text:      "#0D1117",   // primary
  textMid:   "#48566A",   // secondary
  textMuted: "#8A97A8",   // tertiary / labels

  // Brand + accents (used sparingly — one accent per surface)
  brand:     "#2563EB",
  brandSoft: "#EEF3FF",
  navy:      "#0A2540",
  cyan:      "#00B8D4",
  violet:    "#7C3AED",
  teal:      "#0D9488",
  amber:     "#D97706",
  rose:      "#DC2626",
  emerald:   "#059669",

  // Status tints (bg / fg pairs)
  goodBg: "#ECFDF5", good: "#059669",
  warnBg: "#FFFBEB", warn: "#D97706",
  badBg:  "#FEF2F2", bad:  "#DC2626",
  infoBg: "#EEF3FF", info: "#2563EB",
};

// 4px base spacing scale
export const space = { 0:0, 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 8:32, 10:40, 12:48, 16:64 };

export const radius = { sm:8, md:12, lg:16, xl:20, pill:999 };

export const shadow = {
  none: "none",
  sm:  "0 1px 2px rgba(15,23,42,0.04)",
  md:  "0 4px 16px rgba(15,23,42,0.08)",
  lg:  "0 12px 32px rgba(15,23,42,0.12)",
  ring:(c) => `0 0 0 3px ${c}`,
};

// Type scale — one family, tight tracking on large sizes
export const font = {
  family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  display: { fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15 },
  h1:      { fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em",  lineHeight: 1.2 },
  h2:      { fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em",  lineHeight: 1.3 },
  metric:  { fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em",  lineHeight: 1 },
  body:    { fontSize: 14, fontWeight: 400, lineHeight: 1.6 },
  small:   { fontSize: 13, fontWeight: 400, lineHeight: 1.5 },
  label:   { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" },
  mono:    { fontFamily: "'SF Mono', ui-monospace, monospace" },
};

export const dur = { fast: "0.12s", base: "0.18s", slow: "0.3s" };
export const ease = "cubic-bezier(0.4, 0, 0.2, 1)";

// ── Primitive style builders ────────────────────────────────────────────────
export const card = (over = {}) => ({
  background: color.surface,
  border: `1px solid ${color.border}`,
  borderRadius: radius.md,
  boxShadow: shadow.sm,
  padding: space[5],
  ...over,
});

export const btn = (variant = "primary", over = {}) => {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
    fontFamily: font.family, fontSize: 13, fontWeight: 600, borderRadius: radius.sm,
    padding: "9px 16px", cursor: "pointer", border: "1px solid transparent",
    transition: `all ${dur.base} ${ease}`, whiteSpace: "nowrap",
  };
  const variants = {
    primary:   { background: color.brand, color: "#fff" },
    secondary: { background: color.surface, color: color.textMid, border: `1px solid ${color.border}` },
    ghost:     { background: "transparent", color: color.textMid },
    dark:      { background: color.navy, color: "#fff" },
  };
  return { ...base, ...variants[variant], ...over };
};

// Status chip: chip("good","On track")
export const chipStyle = (tone = "info", over = {}) => {
  const map = {
    good: [color.goodBg, color.good], warn: [color.warnBg, color.warn],
    bad: [color.badBg, color.bad], info: [color.infoBg, color.info],
    neutral: ["#F1F5F9", color.textMid],
  };
  const [bg, fg] = map[tone] || map.info;
  return {
    display: "inline-flex", alignItems: "center", gap: 5, background: bg, color: fg,
    fontSize: 11, fontWeight: 700, borderRadius: radius.pill, padding: "3px 10px",
    whiteSpace: "nowrap", ...over,
  };
};

export const label = (over = {}) => ({ ...font.label, color: color.textMuted, ...over });
