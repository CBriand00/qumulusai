import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { useBreakpoint } from "./useBreakpoint";
import { brand, company } from "./brand";

// ── Design tokens (match App.jsx) ─────────────────────────────────────────────
const C = {
  bgCard:    "#FFFFFF",
  textDark:  "#0D1117",
  textMid:   "#48566A",
  textMuted: "#8A97A8",
  border:    "#E9ECF1",
  cyan:      "#00C2E0",
  navy:      "#0A2540",
  blue:      "#2563EB",
  violet:    "#7C3AED",
  teal:      "#0D9488",
  amber:     "#D97706",
  rose:      "#DC2626",
  emerald:   "#059669",
};

// ── Shared helpers ────────────────────────────────────────────────────────────
const DAY = 86400000;
const today = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");

function fmt$(n) {
  if (n == null) return "—";
  return "$" + Math.round(Number(n)).toLocaleString("en-US");
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(d) {
  if (!d) return null;
  return Math.round((new Date(d + "T00:00:00") - today()) / DAY);
}

function addDays(d, n) {
  if (!d) return null;
  return new Date(new Date(d + "T00:00:00").getTime() + n * DAY).toISOString().slice(0, 10);
}

function Card({ children, style, ...rest }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", ...style }} {...rest}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${accent}18`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{icon}</div>
      <div>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: C.textDark, margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
        <p style={{ fontSize: 12.5, color: C.textMuted, margin: "3px 0 0", lineHeight: 1.5 }}>{subtitle}</p>
      </div>
    </div>
  );
}

function Label({ children, color, style }) {
  return <div style={{ fontSize: 10, color: color || C.textMuted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", ...style }}>{children}</div>;
}

// Every KPI is a filter into the list below it — no number is a dead end.
function KpiRow({ kpis, filter, setFilter, accent, cols }) {
  const { isMobile } = useBreakpoint();
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : `repeat(${cols || kpis.length}, 1fr)`, gap: 12, marginBottom: 14 }}>
      {kpis.map(m => (
        <Card key={m.label} onClick={() => setFilter(m.f)}
          style={{ padding: "16px 18px", cursor: "pointer", borderColor: filter === m.f ? accent : C.border, transition: "border-color 0.15s" }}>
          <Label style={{ marginBottom: 8 }}>{m.label}</Label>
          <div style={{ fontSize: 22, fontWeight: 900, color: m.tone || C.textDark, textDecoration: "underline", textDecorationColor: `${accent}40`, textUnderlineOffset: 3 }}>{m.value}</div>
          {m.sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{m.sub}</div>}
        </Card>
      ))}
    </div>
  );
}

function Chips({ options, value, onChange, accent }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
      {options.map(([k, lbl]) => {
        const on = value === k;
        return (
          <button key={k} onClick={() => onChange(k)}
            style={{ background: on ? accent : C.bgCard, color: on ? "#fff" : C.textMid, border: `1px solid ${on ? accent : C.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ children, color, solid }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, background: solid ? color : `${color}14`, color: solid ? "#fff" : color, borderRadius: 20, padding: "3px 9px", whiteSpace: "nowrap", flexShrink: 0 }}>
      {children}
    </span>
  );
}

function Detail({ k, v }) {
  return (
    <div>
      <Label style={{ fontSize: 9.5, letterSpacing: "0.06em" }}>{k}</Label>
      <div style={{ fontSize: 12.5, color: C.textDark, fontWeight: 500, marginTop: 3 }}>{v ?? "—"}</div>
    </div>
  );
}

function Empty({ children }) {
  return <p style={{ fontSize: 13, color: C.textMuted, padding: "20px 22px", margin: 0 }}>{children}</p>;
}

function Loading({ icon, accent, title, subtitle }) {
  return <div><SectionHeader icon={icon} accent={accent} title={title} subtitle={subtitle} /><Card><p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>Loading…</p></Card></div>;
}

function Footnote({ children }) {
  return <p style={{ fontSize: 11.5, color: C.textMuted, margin: "12px 2px 0", lineHeight: 1.6 }}>{children}</p>;
}

function csvDownload(rows, filename) {
  const csv = rows.map(r => r.map(c => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════════
// WORKERS' COMPENSATION
// ══════════════════════════════════════════════════════════════════════════════

const WC_STATUS = {
  open:      { label: "Open",      color: C.blue },
  closed:    { label: "Closed",    color: C.textMuted },
  litigated: { label: "Litigated", color: C.rose },
  denied:    { label: "Denied",    color: C.textMuted },
};

const incurred = c => Number(c.reserve_amount || 0) + Number(c.paid_medical || 0) + Number(c.paid_indemnity || 0);

export function WorkersComp({ onNavigate }) {
  const { isMobile } = useBreakpoint();
  const [claims, setClaims] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [empMap, setEmpMap] = useState({});
  const [filter, setFilter] = useState("open");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("workers_comp_claims").select("*").order("date_reported", { ascending: false }),
      supabase.from("safety_incidents").select("*"),
      supabase.from("employees").select("id, full_name"),
    ]).then(([{ data: c }, { data: i }, { data: e }]) => {
      setClaims(c || []);
      setIncidents(i || []);
      setEmpMap((e || []).reduce((m, x) => { m[x.id] = x.full_name; return m; }, {}));
    });
  }, []);

  if (!claims) return <Loading icon="⛑" accent={C.rose} title="Workers' Compensation" subtitle="Claims, reserves, and return-to-work." />;

  const incMap = incidents.reduce((m, x) => { m[x.id] = x; return m; }, {});
  const openClaims = claims.filter(c => c.status === "open" || c.status === "litigated");
  const totalIncurred = claims.reduce((s, c) => s + incurred(c), 0);
  const openIncurred = openClaims.reduce((s, c) => s + incurred(c), 0);
  const lostDays = claims.reduce((s, c) => s + Number(c.lost_time_days || 0), 0);
  const litigated = claims.filter(c => c.status === "litigated");
  const outOnLeave = openClaims.filter(c => !c.rtw_date);

  const visible =
    filter === "open"       ? openClaims :
    filter === "litigated"  ? litigated :
    filter === "openleave"  ? outOnLeave :
    filter === "closed"     ? claims.filter(c => c.status === "closed" || c.status === "denied") :
    claims;

  const kpis = [
    { label: "Open Claims", value: openClaims.length, f: "open" },
    { label: "Incurred — Open", value: fmt$(openIncurred), f: "open", sub: fmt$(totalIncurred) + " all-time" },
    { label: "In Litigation", value: litigated.length, f: "litigated", tone: litigated.length ? C.rose : C.textDark },
    { label: "Not Yet Returned", value: outOnLeave.length, f: "openleave", tone: outOnLeave.length ? C.amber : C.textDark, sub: lostDays + " lost days total" },
  ];

  return (
    <div>
      <SectionHeader icon="⛑" accent={C.rose} title="Workers' Compensation"
        subtitle="Claims, reserves, litigation exposure, and return-to-work tracking. Linked to the OSHA log where an incident is also recordable." />

      <KpiRow kpis={kpis} filter={filter} setFilter={setFilter} accent={C.rose} />
      <Chips accent={C.rose} value={filter} onChange={setFilter}
        options={[["open", "Open"], ["litigated", "Litigation"], ["openleave", "Out on leave"], ["closed", "Closed & denied"], ["all", "All"]]} />

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {visible.length === 0 ? <Empty>No claims match this view.</Empty> : visible.map((c, i) => {
          const expanded = open === c.id;
          const st = WC_STATUS[c.status];
          const name = c.employee_id ? empMap[c.employee_id] : null;
          const inc = c.incident_id ? incMap[c.incident_id] : null;
          return (
            <div key={c.id} style={{ borderBottom: i < visible.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div onClick={() => setOpen(expanded ? null : c.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 22px", cursor: "pointer", background: expanded ? "#FAFBFC" : "transparent" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${st.color}18`, color: st.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>⛑</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: C.textDark }}>{c.claim_number} · {name || "Unassigned claimant"}</div>
                  <div style={{ fontSize: 11.5, color: C.textMuted }}>{inc ? inc.description.slice(0, 68) + (inc.description.length > 68 ? "…" : "") : "No linked OSHA incident"}</div>
                </div>
                <span style={{ fontSize: 12.5, color: C.textDark, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{fmt$(incurred(c))}</span>
                <Pill color={st.color}>{st.label}</Pill>
                <span style={{ color: "#CBD5E1", fontSize: 12, transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>›</span>
              </div>
              {expanded && (
                <div style={{ padding: "2px 22px 18px 22px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 14 }}>
                  <Detail k="Reserve" v={fmt$(c.reserve_amount)} />
                  <Detail k="Paid — medical" v={fmt$(c.paid_medical)} />
                  <Detail k="Paid — indemnity" v={fmt$(c.paid_indemnity)} />
                  <Detail k="Total incurred" v={fmt$(incurred(c))} />
                  <Detail k="Carrier" v={c.carrier} />
                  <Detail k="Policy" v={c.policy_number} />
                  <Detail k="Adjuster" v={c.adjuster} />
                  <Detail k="Reported" v={fmtDate(c.date_reported)} />
                  <Detail k="Lost time" v={c.lost_time_days ? c.lost_time_days + " days" : "None"} />
                  <Detail k="Returned to work" v={c.rtw_date ? fmtDate(c.rtw_date) : "Not returned"} />
                  <Detail k="Compensable" v={c.compensable === null ? "Undetermined" : c.compensable ? "Yes" : "No"} />
                  <Detail k="OSHA case" v={inc ? inc.case_number : "Not recordable"} />
                  {c.restrictions && <div style={{ gridColumn: "1 / -1" }}><Detail k="Restrictions" v={c.restrictions} /></div>}
                  {inc && onNavigate && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <button onClick={() => onNavigate("osha")}
                        style={{ background: "none", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                        View {inc.case_number} on the OSHA 300 log →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Footnote>
        Incurred = reserve + paid medical + paid indemnity. Reserves drive the experience mod, which drives premium — an open reserve costs
        money even when nothing is being paid, so closing stale claims is a real budget lever. Recordability and compensability are tracked
        separately: a claim can be denied and still sit on the OSHA log, and a first-aid case can be recordable with no claim at all.
      </Footnote>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OSHA 300A
// ══════════════════════════════════════════════════════════════════════════════

const ILLNESS_COLS = [
  ["injury", "Injury"], ["skin", "Skin disorder"], ["respiratory", "Respiratory"],
  ["poisoning", "Poisoning"], ["hearing", "Hearing loss"], ["other", "All other"],
];

const OUTCOME_LABELS = {
  death: "Death", days_away: "Days away", restricted: "Job transfer / restriction",
  other_recordable: "Other recordable", first_aid: "First aid only",
};

export function Osha300A({ onNavigate }) {
  const { isMobile } = useBreakpoint();
  const [incidents, setIncidents] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [empMap, setEmpMap] = useState({});
  const [year, setYear] = useState(null);
  const [filter, setFilter] = useState("recordable");

  useEffect(() => {
    Promise.all([
      supabase.from("safety_incidents").select("*").order("incident_date", { ascending: true }),
      supabase.from("osha_annual_summaries").select("*").order("year", { ascending: false }),
      supabase.from("employees").select("id, full_name"),
    ]).then(([{ data: i }, { data: s }, { data: e }]) => {
      setIncidents(i || []);
      setSummaries(s || []);
      setEmpMap((e || []).reduce((m, x) => { m[x.id] = x.full_name; return m; }, {}));
      setYear((s || [])[0]?.year ?? new Date().getFullYear());
    });
  }, []);

  if (!incidents || year == null) return <Loading icon="▤" accent={C.amber} title="OSHA 300A" subtitle="Annual injury and illness summary." />;

  const years = summaries.map(s => s.year);
  const summary = summaries.find(s => s.year === year);
  const yearIncidents = incidents.filter(i => new Date(i.incident_date).getFullYear() === year);
  const recordable = yearIncidents.filter(i => i.recordable);

  // 300A columns G–J, derived from the log rather than entered twice.
  const G = recordable.filter(i => i.outcome === "death").length;
  const H = recordable.filter(i => i.outcome === "days_away").length;
  const I = recordable.filter(i => i.outcome === "restricted").length;
  const J = recordable.filter(i => i.outcome === "other_recordable").length;
  const K = recordable.reduce((s, i) => s + Number(i.days_away || 0), 0);
  const L = recordable.reduce((s, i) => s + Number(i.days_restricted || 0), 0);
  const byIllness = ILLNESS_COLS.map(([k, lbl]) => [lbl, recordable.filter(i => i.illness_type === k).length]);

  const hours = Number(summary?.total_hours_worked || 0);
  // TRIR and DART are per 100 full-time workers: 200,000 = 100 workers x 2,000 hrs.
  const trir = hours ? (recordable.length * 200000) / hours : null;
  const dart = hours ? ((H + I) * 200000) / hours : null;

  const visible = filter === "recordable" ? recordable : filter === "nonrecordable" ? yearIncidents.filter(i => !i.recordable) : yearIncidents;

  const kpis = [
    { label: "Recordable Cases", value: recordable.length, f: "recordable" },
    { label: "TRIR", value: trir == null ? "—" : trir.toFixed(2), f: "recordable", sub: "per 100 FTE" },
    { label: "DART Rate", value: dart == null ? "—" : dart.toFixed(2), f: "recordable", sub: "days away / restricted" },
    { label: "Days Away", value: K, f: "recordable", sub: L + " restricted" },
  ];

  function exportLog() {
    const rows = [
      [`OSHA Form 300 — Log of Work-Related Injuries and Illnesses`],
      [`${brand.name} · ${summary?.establishment || company.location} · ${year}`],
      [],
      ["Case", "Employee", "Job title", "Date", "Where it occurred", "Description", "Body part", "Classification", "Days away", "Days restricted", "Type", "Recordable"],
      ...yearIncidents.map(i => [
        i.case_number, i.privacy_case ? "Privacy case" : (empMap[i.employee_id] || "—"), i.job_title, i.incident_date,
        i.where_occurred, i.description, i.body_part, OUTCOME_LABELS[i.outcome], i.days_away, i.days_restricted,
        i.illness_type, i.recordable ? "Yes" : "No",
      ]),
    ];
    csvDownload(rows, `${brand.name.replace(/\s+/g, "")}_OSHA300_${year}.csv`);
  }

  const posting = summary?.posted_date;
  const certified = summary?.certified_date;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <SectionHeader icon="▤" accent={C.amber} title="OSHA 300A"
          subtitle="Annual summary of work-related injuries and illnesses, derived live from the 300 log." />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ background: C.bgCard, color: C.textDark, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={exportLog}
            style={{ background: C.bgCard, color: C.textMid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            ⬇ Export 300 Log
          </button>
        </div>
      </div>

      {/* Posting-window banner — 300A must be posted Feb 1 to Apr 30. */}
      {!certified && (
        <Card style={{ marginBottom: 14, borderColor: C.amber, background: "#FFFBEB" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ color: C.amber, fontSize: 14 }}>⚠</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.textDark }}>{year} summary not yet certified</div>
              <div style={{ fontSize: 12, color: C.textMid, marginTop: 3, lineHeight: 1.6 }}>
                A company executive must certify the 300A, and it must be posted in a common area from <strong>February 1 to April 30, {year + 1}</strong>.
                Establishments with 250+ employees — or 20+ in a high-risk industry — also file electronically through OSHA's ITA by March 2.
              </div>
            </div>
          </div>
        </Card>
      )}

      <KpiRow kpis={kpis} filter={filter} setFilter={setFilter} accent={C.amber} />

      {/* The 300A form itself */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <Label color={C.amber} style={{ marginBottom: 0 }}>Form 300A — Summary of Work-Related Injuries and Illnesses · {year}</Label>
          <span style={{ fontSize: 11.5, color: C.textMuted }}>{summary?.establishment || company.location}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
          <Detail k="(G) Deaths" v={G} />
          <Detail k="(H) Cases w/ days away" v={H} />
          <Detail k="(I) Cases w/ transfer or restriction" v={I} />
          <Detail k="(J) Other recordable cases" v={J} />
          <Detail k="(K) Total days away" v={K} />
          <Detail k="(L) Total days restricted" v={L} />
          <Detail k="Annual average employees" v={summary?.avg_employees ?? "—"} />
          <Detail k="Total hours worked" v={hours ? hours.toLocaleString("en-US") : "—"} />
        </div>

        <Label style={{ marginBottom: 8 }}>(M) Injury and illness types</Label>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: 12, marginBottom: 18 }}>
          {byIllness.map(([lbl, n]) => (
            <div key={lbl} style={{ background: "#FAFBFC", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: n ? C.textDark : C.textMuted }}>{n}</div>
              <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
          <Detail k="Certified by" v={summary?.certified_by ? `${summary.certified_by} · ${summary.certified_title}` : "Awaiting certification"} />
          <Detail k="Certified on" v={certified ? fmtDate(certified) : "—"} />
          <Detail k="Posted" v={posting ? fmtDate(posting) + " → Apr 30" : "Not yet posted"} />
        </div>
      </Card>

      <Chips accent={C.amber} value={filter} onChange={setFilter}
        options={[["recordable", "Recordable"], ["nonrecordable", "Not recordable"], ["all", "All incidents"]]} />

      {/* The 300 log */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {visible.length === 0 ? <Empty>No incidents recorded for {year} in this view.</Empty> : visible.map((i, idx) => (
          <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 22px", borderBottom: idx < visible.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ width: 52, fontSize: 11.5, fontWeight: 800, color: C.textMuted, flexShrink: 0 }}>{i.case_number}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.textDark }}>
                {i.privacy_case ? <em style={{ color: C.textMuted }}>Privacy case</em> : (empMap[i.employee_id] || "Unassigned")}
                <span style={{ color: C.textMuted, fontWeight: 400 }}> · {fmtDate(i.incident_date)}</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.description}</div>
            </div>
            {(i.days_away > 0 || i.days_restricted > 0) && (
              <span style={{ fontSize: 11.5, color: C.textMid, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                {i.days_away > 0 && `${i.days_away}d away`}{i.days_away > 0 && i.days_restricted > 0 && " · "}{i.days_restricted > 0 && `${i.days_restricted}d restr.`}
              </span>
            )}
            <Pill color={i.recordable ? C.amber : C.textMuted}>{OUTCOME_LABELS[i.outcome]}</Pill>
          </div>
        ))}
      </Card>

      <Footnote>
        TRIR = recordable cases × 200,000 ÷ hours worked. DART counts only cases with days away, transfer, or restriction. Both normalize to
        100 full-time workers so a growing headcount doesn't flatter the number. First-aid-only cases are logged here but excluded from every
        rate — that line is where most employers over-record and inflate their own TRIR.
        {hours > 0 && summary?.avg_employees != null && summary.avg_employees < 100 && (
          <>
            {" "}
            <strong>Read the rate with care at this headcount.</strong> With {summary.avg_employees} average employees, a single recordable
            moves TRIR by roughly {(200000 / hours).toFixed(1)} points, so year-over-year swings are mostly denominator noise rather than
            a change in how safe the work is. Benchmarking against published industry rates is not meaningful below about 100 FTE — until
            then the honest measures are absolute case count, severity, and leading indicators like near-miss reporting and permit compliance.
          </>
        )}
      </Footnote>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WOTC
// ══════════════════════════════════════════════════════════════════════════════

// Qualified first-year wage caps by target group. Credit is 40% of wages at
// 400+ hours, 25% at 120–399, nothing below 120.
const WOTC_GROUPS = {
  veteran_snap:             { label: "Veteran — SNAP recipient",            cap: 6000 },
  veteran_disabled:         { label: "Veteran — service-connected disability", cap: 12000 },
  veteran_disabled_lt:      { label: "Veteran — disabled, unemployed 6mo+", cap: 24000 },
  veteran_unemployed_short: { label: "Veteran — unemployed 4wk–6mo",        cap: 6000 },
  veteran_unemployed_long:  { label: "Veteran — unemployed 6mo+",           cap: 14000 },
  snap:                     { label: "SNAP recipient",                      cap: 6000 },
  tanf_short:               { label: "TANF recipient (short-term)",         cap: 6000 },
  tanf_long:                { label: "Long-term family assistance",         cap: 10000 },
  ex_felon:                 { label: "Ex-felon / fair-chance hire",         cap: 6000 },
  designated_community:     { label: "Designated community resident",       cap: 6000 },
  vocational_rehab:         { label: "Vocational rehab referral",           cap: 6000 },
  ssi:                      { label: "SSI recipient",                       cap: 6000 },
  summer_youth:             { label: "Summer youth employee",               cap: 3000 },
  long_term_unemployed:     { label: "Long-term unemployed (27wk+)",        cap: 6000 },
};

const WOTC_STATUS = {
  requested:              { label: "Requested",   color: C.textMuted },
  questionnaire_returned: { label: "Returned",    color: C.blue },
  submitted_8850:         { label: "8850 filed",  color: C.violet },
  certified:              { label: "Certified",   color: C.emerald },
  denied:                 { label: "Denied",      color: C.textMuted },
  expired:                { label: "Expired",     color: C.rose },
};

const FILING_WINDOW = 28; // days from start date for Form 8850 to reach the SWA
const needs8850 = w => w.status === "requested" || w.status === "questionnaire_returned";

// Projected credit if the screening certifies at current hours.
function projectedCredit(w) {
  const cap = WOTC_GROUPS[w.target_group]?.cap || 0;
  const wages = Math.min(Number(w.qualified_wages || 0), cap);
  const hrs = Number(w.hours_worked || 0);
  const rate = hrs >= 400 ? 0.4 : hrs >= 120 ? 0.25 : 0;
  return Math.round(wages * rate);
}

export function WOTC({ onNavigate }) {
  const { isMobile } = useBreakpoint();
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    supabase.from("wotc_screenings").select("*").order("hire_date", { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, []);

  if (!rows) return <Loading icon="◈" accent={C.emerald} title="WOTC" subtitle="Work Opportunity Tax Credit screening and certification." />;

  const deadlineOf = w => addDays(w.hire_date, FILING_WINDOW);
  const pending = rows.filter(needs8850);
  const atRisk = pending.filter(w => { const d = daysUntil(deadlineOf(w)); return d != null && d <= 14; });
  const certified = rows.filter(w => w.status === "certified");
  const awaiting = rows.filter(w => w.status === "submitted_8850");
  const expired = rows.filter(w => w.status === "expired");

  const captured = certified.reduce((s, w) => s + Number(w.credit_amount || 0), 0);
  const realized = certified.filter(w => w.credit_realized).reduce((s, w) => s + Number(w.credit_amount || 0), 0);
  const unclaimed = captured - realized;
  const forfeited = expired.reduce((s, w) => s + (WOTC_GROUPS[w.target_group]?.cap || 0) * 0.4, 0);
  const pipeline = awaiting.reduce((s, w) => s + (WOTC_GROUPS[w.target_group]?.cap || 0) * 0.4, 0);

  const visible =
    filter === "pending"   ? pending :
    filter === "atrisk"    ? atRisk :
    filter === "awaiting"  ? awaiting :
    filter === "certified" ? certified :
    filter === "expired"   ? expired :
    rows;

  const kpis = [
    { label: "8850 Due", value: pending.length, f: "pending", tone: atRisk.length ? C.rose : C.textDark, sub: atRisk.length ? `${atRisk.length} within 14 days` : "none urgent" },
    { label: "Credit Captured", value: fmt$(captured), f: "certified", sub: fmt$(unclaimed) + " not yet claimed" },
    { label: "In Pipeline", value: fmt$(pipeline), f: "awaiting", sub: awaiting.length + " awaiting SWA" },
    { label: "Forfeited", value: fmt$(forfeited), f: "expired", tone: forfeited ? C.rose : C.textDark, sub: expired.length + " missed deadline" },
  ];

  return (
    <div>
      <SectionHeader icon="◈" accent={C.emerald} title="WOTC"
        subtitle="Work Opportunity Tax Credit — screening requests, Form 8850 deadlines, certification, and realized credit." />

      <KpiRow kpis={kpis} filter={filter} setFilter={setFilter} accent={C.emerald} />

      {atRisk.length > 0 && (
        <Card style={{ marginBottom: 14, borderColor: C.rose, background: "#FEF2F2" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ color: C.rose, fontSize: 14 }}>⚠</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.textDark }}>
                {atRisk.length} screening{atRisk.length > 1 ? "s" : ""} within 14 days of the Form 8850 filing deadline
              </div>
              <div style={{ fontSize: 12, color: C.textMid, marginTop: 3, lineHeight: 1.6 }}>
                Form 8850 must reach the state workforce agency within <strong>{FILING_WINDOW} days of the start date</strong>. The deadline is
                statutory and there is no extension — miss it and the credit is gone regardless of eligibility.
              </div>
            </div>
          </div>
        </Card>
      )}

      <Chips accent={C.emerald} value={filter} onChange={setFilter}
        options={[["pending", "8850 due"], ["atrisk", "Deadline ≤14d"], ["awaiting", "Awaiting SWA"], ["certified", "Certified"], ["expired", "Expired"], ["all", "All"]]} />

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {visible.length === 0 ? <Empty>No screenings match this view.</Empty> : visible.map((w, i) => {
          const expanded = open === w.id;
          const st = WOTC_STATUS[w.status];
          const grp = WOTC_GROUPS[w.target_group];
          const dl = deadlineOf(w);
          const left = daysUntil(dl);
          const urgent = needs8850(w) && left != null && left <= 14;
          return (
            <div key={w.id} style={{ borderBottom: i < visible.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div onClick={() => setOpen(expanded ? null : w.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 22px", cursor: "pointer", background: expanded ? "#FAFBFC" : "transparent" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${st.color}18`, color: st.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                  {w.applicant_name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: C.textDark }}>{w.applicant_name}</div>
                  <div style={{ fontSize: 11.5, color: C.textMuted }}>{grp?.label || "Group not yet identified"} · hired {fmtDate(w.hire_date)}</div>
                </div>
                {w.status === "certified" && <span style={{ fontSize: 12.5, color: C.emerald, fontWeight: 700, flexShrink: 0 }}>{fmt$(w.credit_amount)}</span>}
                {urgent && <Pill color={left < 0 ? C.rose : C.amber} solid={left < 0}>{left < 0 ? "OVERDUE" : `${left}d to file`}</Pill>}
                <Pill color={st.color}>{st.label}</Pill>
                <span style={{ color: "#CBD5E1", fontSize: 12, transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>›</span>
              </div>
              {expanded && (
                <div style={{ padding: "2px 22px 18px 22px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 14 }}>
                  <Detail k="Role" v={w.role_title} />
                  <Detail k="Target group" v={grp?.label} />
                  <Detail k="Wage cap" v={grp ? fmt$(grp.cap) : "—"} />
                  <Detail k="8850 deadline" v={dl ? fmtDate(dl) : "—"} />
                  <Detail k="Requested" v={fmtDate(w.requested_at)} />
                  <Detail k="Questionnaire back" v={fmtDate(w.questionnaire_returned_at)} />
                  <Detail k="8850 filed" v={fmtDate(w.form_8850_submitted_at)} />
                  <Detail k="Determination" v={fmtDate(w.determination_date)} />
                  <Detail k="Hours worked" v={Number(w.hours_worked).toLocaleString("en-US")} />
                  <Detail k="Qualified wages" v={fmt$(w.qualified_wages)} />
                  <Detail k="Credit rate" v={w.hours_worked >= 400 ? "40%" : w.hours_worked >= 120 ? "25%" : "0% — under 120 hrs"} />
                  <Detail k={w.status === "certified" ? "Credit" : "Projected credit"} v={fmt$(w.status === "certified" ? w.credit_amount : projectedCredit(w))} />
                  <Detail k="State agency" v={w.state_agency} />
                  <Detail k="Claimed on return" v={w.status === "certified" ? (w.credit_realized ? "Yes" : "Not yet claimed") : "—"} />
                  {w.notes && <div style={{ gridColumn: "1 / -1" }}><Detail k="Notes" v={w.notes} /></div>}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Footnote>
        WOTC is a federal credit against income tax for hiring from target groups. Screening happens on or before the offer, Form 8850 goes to
        the SWA within {FILING_WINDOW} days of start, and the credit is 40% of qualified first-year wages at 400+ hours worked or 25% at
        120–399. Below 120 hours there is no credit. Certification without a filed return is money sitting on the table, which is why captured
        and realized are tracked as separate numbers.
      </Footnote>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// UNEMPLOYMENT
// ══════════════════════════════════════════════════════════════════════════════

const SEP_REASONS = {
  voluntary_quit:        { label: "Voluntary quit",        protestable: true },
  discharge_misconduct:  { label: "Discharge — misconduct", protestable: true },
  discharge_performance: { label: "Discharge — performance", protestable: false },
  layoff:                { label: "Layoff",                protestable: false },
  rif:                   { label: "Reduction in force",    protestable: false },
  end_of_assignment:     { label: "End of assignment",     protestable: false },
  failed_probation:      { label: "Failed probation",      protestable: false },
};

const UI_STATUS = {
  received:          { label: "Received",  color: C.amber },
  responded:         { label: "Responded", color: C.blue },
  protested:         { label: "Protested", color: C.violet },
  hearing_scheduled: { label: "Hearing",   color: C.violet },
  determined:        { label: "Determined", color: C.textMuted },
  appealed:          { label: "Appealed",  color: C.textMuted },
};

const OUTCOME_STYLE = {
  allowed:   { label: "Allowed — charged", color: C.rose },
  denied:    { label: "Denied — no charge", color: C.emerald },
  withdrawn: { label: "Withdrawn", color: C.textMuted },
  pending:   { label: "Pending", color: C.textMuted },
};

export function Unemployment({ onNavigate }) {
  const { isMobile } = useBreakpoint();
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("open");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    supabase.from("unemployment_claims").select("*").order("claim_date", { ascending: false })
      .then(({ data }) => setRows(data || []));
  }, []);

  if (!rows) return <Loading icon="◇" accent={C.violet} title="Unemployment Claims" subtitle="UI claims, protests, and benefit charges." />;

  const openClaims = rows.filter(c => c.status !== "determined" && c.status !== "appealed");
  const needsResponse = rows.filter(c => c.status === "received");
  const dueSoon = needsResponse.filter(c => { const d = daysUntil(c.response_due); return d != null && d <= 7; });
  const charged = rows.reduce((s, c) => s + Number(c.benefit_charge || 0), 0);
  const hearings = rows.filter(c => c.status === "hearing_scheduled");

  // Win rate counts only protests that reached a determination.
  const decidedProtests = rows.filter(c => c.protested && c.outcome && c.outcome !== "pending");
  const wonProtests = decidedProtests.filter(c => c.outcome === "denied" || c.outcome === "withdrawn");
  const winRate = decidedProtests.length ? Math.round((wonProtests.length / decidedProtests.length) * 100) : null;

  const visible =
    filter === "open"     ? openClaims :
    filter === "response" ? needsResponse :
    filter === "hearing"  ? hearings :
    filter === "charged"  ? rows.filter(c => Number(c.benefit_charge) > 0) :
    filter === "protest"  ? rows.filter(c => c.protested) :
    rows;

  const kpis = [
    { label: "Open Claims", value: openClaims.length, f: "open" },
    { label: "Response Due", value: needsResponse.length, f: "response", tone: dueSoon.length ? C.rose : C.textDark, sub: dueSoon.length ? `${dueSoon.length} within 7 days` : "none urgent" },
    { label: "Benefit Charges", value: fmt$(charged), f: "charged", sub: "hits the SUTA experience rate" },
    { label: "Protest Win Rate", value: winRate == null ? "—" : winRate + "%", f: "protest", tone: C.emerald, sub: `${wonProtests.length} of ${decidedProtests.length} decided` },
  ];

  return (
    <div>
      <SectionHeader icon="◇" accent={C.violet} title="Unemployment Claims"
        subtitle="UI claims, response deadlines, protest posture, hearings, and benefit charges against the experience rate." />

      <KpiRow kpis={kpis} filter={filter} setFilter={setFilter} accent={C.violet} />

      {dueSoon.length > 0 && (
        <Card style={{ marginBottom: 14, borderColor: C.rose, background: "#FEF2F2" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ color: C.rose, fontSize: 14 }}>⚠</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.textDark }}>{dueSoon.length} claim{dueSoon.length > 1 ? "s" : ""} with a response deadline inside 7 days</div>
              <div style={{ fontSize: 12, color: C.textMid, marginTop: 3, lineHeight: 1.6 }}>
                Most states allow about 10 days to respond. Missing the window forfeits the protest and the claim is charged by default —
                the cheapest unemployment cost control there is, is answering on time.
              </div>
            </div>
          </div>
        </Card>
      )}

      <Chips accent={C.violet} value={filter} onChange={setFilter}
        options={[["open", "Open"], ["response", "Response due"], ["hearing", "Hearings"], ["protest", "Protested"], ["charged", "Charged"], ["all", "All"]]} />

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {visible.length === 0 ? <Empty>No claims match this view.</Empty> : visible.map((c, i) => {
          const expanded = open === c.id;
          const st = UI_STATUS[c.status];
          const sep = SEP_REASONS[c.separation_reason];
          const left = daysUntil(c.response_due);
          const urgent = c.status === "received" && left != null && left <= 7;
          return (
            <div key={c.id} style={{ borderBottom: i < visible.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div onClick={() => setOpen(expanded ? null : c.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 22px", cursor: "pointer", background: expanded ? "#FAFBFC" : "transparent" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${st.color}18`, color: st.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                  {c.claimant_name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: C.textDark }}>{c.claimant_name} <span style={{ color: C.textMuted, fontWeight: 400 }}>· {c.state}</span></div>
                  <div style={{ fontSize: 11.5, color: C.textMuted }}>{sep?.label || "Reason not coded"} · filed {fmtDate(c.claim_date)}</div>
                </div>
                {Number(c.benefit_charge) > 0 && <span style={{ fontSize: 12.5, color: C.rose, fontWeight: 700, flexShrink: 0 }}>{fmt$(c.benefit_charge)}</span>}
                {urgent && <Pill color={left < 0 ? C.rose : C.amber} solid={left < 0}>{left < 0 ? "OVERDUE" : `${left}d to respond`}</Pill>}
                <Pill color={st.color}>{st.label}</Pill>
                <span style={{ color: "#CBD5E1", fontSize: 12, transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>›</span>
              </div>
              {expanded && (
                <div style={{ padding: "2px 22px 18px 22px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 14 }}>
                  <Detail k="Claim number" v={c.claim_number} />
                  <Detail k="State" v={c.state} />
                  <Detail k="Separated" v={fmtDate(c.separation_date)} />
                  <Detail k="Separation reason" v={sep?.label} />
                  <Detail k="Response due" v={fmtDate(c.response_due)} />
                  <Detail k="Responded" v={c.responded_at ? fmtDate(c.responded_at) : "Not yet"} />
                  <Detail k="Protested" v={c.protested ? "Yes" : "No"} />
                  <Detail k="Hearing" v={c.hearing_date ? fmtDate(c.hearing_date) : "None"} />
                  <Detail k="Weekly benefit" v={fmt$(c.weekly_benefit)} />
                  <Detail k="Charged to account" v={Number(c.benefit_charge) > 0 ? fmt$(c.benefit_charge) : "None"} />
                  <div>
                    <Label style={{ fontSize: 9.5, letterSpacing: "0.06em" }}>Outcome</Label>
                    <div style={{ marginTop: 4 }}>
                      {c.outcome ? <Pill color={OUTCOME_STYLE[c.outcome].color}>{OUTCOME_STYLE[c.outcome].label}</Pill> : <span style={{ fontSize: 12.5, color: C.textMuted }}>—</span>}
                    </div>
                  </div>
                  <Detail k="Protest posture" v={sep?.protestable ? "Protestable on the facts" : "Valid claim — do not protest"} />
                  {c.notes && <div style={{ gridColumn: "1 / -1" }}><Detail k="Notes" v={c.notes} /></div>}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Footnote>
        Benefit charges feed the state experience rating, which sets the SUTA rate for the following year — so a claim allowed today is a
        payroll tax increase next year across the whole workforce. Protest where the facts support it and respond on time everywhere; protesting
        a legitimate layoff burns credibility with the agency and wins nothing.
      </Footnote>
    </div>
  );
}
