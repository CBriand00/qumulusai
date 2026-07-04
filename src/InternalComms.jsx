import { useState } from "react";
import { useBreakpoint } from "./useBreakpoint";

const C = {
  bg:       "#F0F2F7",
  bgCard:   "#FFFFFF",
  textDark: "#0D1117",
  textMid:  "#3D4B5C",
  textMuted:"#7E8FA3",
  border:   "#DDE3ED",
  teal:     "#0D9488",
  cyan:     "#00C2E0",
  emerald:  "#059669",
  amber:    "#D97706",
  violet:   "#7C3AED",
  blue:     "#2563EB",
  rose:     "#DC2626",
  navy:     "#0A2540",
};

const CAT_COLOR = {
  leadership:  "#7C3AED",
  people:      "#0D9488",
  engineering: "#2563EB",
  sales:       "#059669",
  operations:  "#D97706",
  hr:          "#0D9488",
  hiring:      "#7C3AED",
  "all-hands": "#00C2E0",
};

const ANNOUNCEMENTS_DATA = [
  {
    id: 1,
    title: "QumulusAI Closes $500M Series B — Accelerating the AI Infrastructure Buildout",
    category: "leadership",
    author: "Mike Maniscalco, CEO",
    date: "2026-06-28",
    pinned: true,
    body: `Today marks a defining milestone for QumulusAI. We have closed a $500 million Series B financing round, led by Andreessen Horowitz with participation from Sequoia and Tiger Global. This investment positions us to accelerate our vision of universalizing access to AI compute at enterprise scale.

This capital infusion reflects the market's confidence in our differentiated bare-metal GPU infrastructure and the execution capability of our team.

With this funding, we will:
• Expand our data center footprint across three new regions by Q4 2026
• Scale headcount from 43 to 300+ employees over the next 18 months
• Launch our next-generation H200 GPU cluster product line
• Establish our EMEA go-to-market presence

To everyone on the team: thank you for building something worth backing. The best is still ahead.

— Mike`,
  },
  {
    id: 2,
    title: "Inaugural VP of People & Culture Search Now Underway",
    category: "people",
    author: "HR Team",
    date: "2026-06-25",
    pinned: false,
    body: "We have formally launched a search for our first VP of People & Culture. This executive will architect and lead our entire people function as we scale 7x over the next 18 months — recruiting, HRBP, total rewards, learning & development, and culture. All employees are encouraged to submit referrals through the internal referral portal. A company-wide Q&A with the hiring panel is scheduled for July 8.",
  },
  {
    id: 3,
    title: "Q2 All-Hands Recap — 140% of Revenue Target, 7 New Enterprise Clients",
    category: "leadership",
    author: "Mike Maniscalco, CEO",
    date: "2026-06-20",
    pinned: false,
    body: "Thank you to the 62 people who joined our Q2 All-Hands last Thursday. Highlights: we exceeded Q2 revenue targets by 40%, achieved 99.97% GPU cluster uptime, and onboarded 7 new enterprise clients including two Fortune 500 companies. Q3 priorities: (1) Infrastructure team scale-up to support new cluster capacity, (2) EMEA market launch, (3) GPU-as-a-Service v2.0 general availability.",
  },
  {
    id: 4,
    title: "Enhanced Benefits Package Effective August 1 — 100% Employer-Paid Health Insurance",
    category: "people",
    author: "HR Team",
    date: "2026-06-18",
    pinned: false,
    body: "Effective August 1, 2026, all full-time employees will receive an upgraded benefits package: 100% employer-paid medical, dental, and vision coverage (for employee + dependents), unlimited PTO with a 2-week minimum, a $5,000 annual learning & development stipend, and equity refresh grants for employees with 2+ years of tenure. Open enrollment runs July 7–14 via the HR portal. Benefits questions: hr@qumulusai.com.",
  },
  {
    id: 5,
    title: "Infrastructure Team Achieves 3.2 Tb/s InfiniBand Fabric — 4x Performance Gain",
    category: "engineering",
    author: "Infrastructure Team",
    date: "2026-06-15",
    pinned: false,
    body: "The infrastructure team completed the InfiniBand fabric upgrade across all Marietta data center nodes, delivering 3.2 Tb/s inter-node bandwidth — a 4x improvement over the previous generation. This positions our H100 clusters as the highest-performance bare-metal offering in the Southeast U.S. market. Full technical write-up in the Engineering Wiki.",
  },
  {
    id: 6,
    title: "Enterprise Sales Closes $12M ARR Quarter — 140% of Target",
    category: "sales",
    author: "Enterprise Sales Team",
    date: "2026-06-10",
    pinned: false,
    body: "The Enterprise Sales team closed Q2 with $12M in net-new ARR — 140% of quota. Notable wins include a 3-year GPU reservation agreement with a major financial services firm and our first U.S. federal government contract. Special recognition to the Solutions Engineering team for their technical support throughout these complex sales cycles.",
  },
  {
    id: 7,
    title: "Marietta Office Expansion — New 4th Floor Opens July 15",
    category: "operations",
    author: "Operations Team",
    date: "2026-06-05",
    pinned: false,
    body: "We are adding a full floor to our Marietta headquarters. The new space includes 60 additional workstations, two executive conference rooms (capacity 20 each), a dedicated AI development lab with high-speed fiber, and a team lounge. Move-in day is July 15. Coordinate with your manager for your seating assignment — IT will be on-site for workstation setup from 8 AM.",
  },
];

const EVENTS = [
  { id: 1, title: "VP People & Culture — Hiring Panel Q&A", date: "2026-07-08", time: "2:00 PM ET", type: "hiring",      location: "Zoom + Marietta HQ, Room A", desc: "Open forum with CEO Mike Maniscalco and the recruiting panel about our VP People & Culture search. All employees welcome to attend and ask questions." },
  { id: 2, title: "Q3 Engineering Roadmap Review",           date: "2026-07-10", time: "10:00 AM ET", type: "engineering",  location: "Marietta HQ — AI Lab",         desc: "CTO-led review of Q3 infrastructure priorities, cluster capacity planning, and technical debt reduction. Engineering staff required; observers welcome." },
  { id: 3, title: "Benefits Open Enrollment Deadline",        date: "2026-07-14", time: "11:59 PM ET", type: "hr",           location: "HR Portal (online)",            desc: "Last day to enroll in or update your benefits elections for the new package effective August 1. Elections cannot be changed after this date outside of qualifying life events." },
  { id: 4, title: "New 4th Floor Office Opening",             date: "2026-07-15", time: "All Day",     type: "operations",   location: "Marietta HQ — 4th Floor",      desc: "Move-in day for the new office floor. IT on-site 8 AM – 6 PM for workstation setup. Check with your manager for your assigned workstation." },
  { id: 5, title: "Q3 Company All-Hands",                    date: "2026-07-22", time: "1:00 PM ET",  type: "all-hands",    location: "Zoom + Marietta HQ",           desc: "Quarterly company-wide meeting. Agenda: Q2 full recap, Q3 priorities and OKRs, org announcements, leadership Q&A. Remote attendance link in calendar invite." },
  { id: 6, title: "EMEA Launch Strategy Workshop",            date: "2026-07-28", time: "9:00 AM ET",  type: "sales",        location: "Virtual — Zoom",               desc: "Cross-functional planning session for EMEA market entry. Sales, Solutions Engineering, and Legal required. Executive observers by invitation." },
];

const MILESTONES = [
  { name: "Ryan Callahan",  type: "anniversary", label: "2-Year Work Anniversary", date: "Jul 8",  dept: "Infrastructure" },
  { name: "Aisha Okonkwo",  type: "birthday",    label: "Birthday",                date: "Jul 12", dept: "Solutions Engineering" },
  { name: "Derek Huang",    type: "anniversary", label: "3-Year Work Anniversary", date: "Jul 19", dept: "DC Operations" },
  { name: "Priya Menon",    type: "birthday",    label: "Birthday",                date: "Jul 22", dept: "Sales" },
  { name: "James Crawford", type: "anniversary", label: "1-Year Work Anniversary", date: "Jul 30", dept: "Finance" },
];

const CATEGORIES = [
  { id: "all",         label: "All" },
  { id: "leadership",  label: "Leadership" },
  { id: "people",      label: "People" },
  { id: "engineering", label: "Engineering" },
  { id: "sales",       label: "Sales" },
  { id: "operations",  label: "Operations" },
];

const fieldStyle = {
  width: "100%", boxSizing: "border-box", background: "#F8FAFC",
  border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px",
  fontSize: 13, color: C.textDark, fontFamily: "inherit", outline: "none",
};

function AnnouncementCard({ ann, isRead, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderLeft: ann.pinned ? `3px solid ${C.teal}` : `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "16px 18px",
        marginBottom: 8,
        cursor: "pointer",
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: CAT_COLOR[ann.category] || C.teal, letterSpacing: "0.08em", textTransform: "uppercase" }}>{ann.category}</span>
        {ann.pinned && <span style={{ fontSize: 9, fontWeight: 800, color: C.textMuted, background: C.bg, borderRadius: 4, padding: "1px 6px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Pinned</span>}
        {!isRead && <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.teal, display: "inline-block", marginLeft: "auto", flexShrink: 0 }} />}
      </div>
      <div style={{ fontSize: 14, fontWeight: isRead ? 500 : 700, color: C.textDark, lineHeight: 1.4, marginBottom: 5 }}>{ann.title}</div>
      <div style={{ fontSize: 11, color: C.textMuted }}>{ann.author} · {ann.date}</div>
    </div>
  );
}

export default function InternalComms() {
  const { isMobile } = useBreakpoint();
  const [filter, setFilter]          = useState("all");
  const [selected, setSelected]      = useState(null);
  const [readIds, setReadIds]        = useState(new Set([3, 4, 5, 6, 7]));
  const [showCreate, setShowCreate]  = useState(false);
  const [eventDetail, setEventDetail] = useState(null);
  const [announcements, setAnnouncements] = useState(ANNOUNCEMENTS_DATA);
  const [newAnn, setNewAnn] = useState({ title: "", category: "leadership", body: "" });
  const [toast, setToast] = useState("");

  const filtered = filter === "all" ? announcements : announcements.filter(a => a.category === filter);
  const pinned   = filtered.filter(a => a.pinned);
  const rest     = filtered.filter(a => !a.pinned);

  function openAnn(ann) {
    setSelected(ann);
    setReadIds(prev => new Set([...prev, ann.id]));
  }

  function handleCreate() {
    if (!newAnn.title.trim() || !newAnn.body.trim()) return;
    const created = { id: Date.now(), ...newAnn, author: "You", date: new Date().toISOString().slice(0, 10), pinned: false };
    setAnnouncements(prev => [created, ...prev]);
    setNewAnn({ title: "", category: "leadership", body: "" });
    setShowCreate(false);
    setToast("Announcement published.");
    setTimeout(() => setToast(""), 3000);
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: C.teal, color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          ✓ {toast}
        </div>
      )}

      {/* Event detail modal */}
      {eventDetail && (
        <div onClick={() => setEventDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bgCard, borderRadius: 14, padding: 28, maxWidth: 500, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: CAT_COLOR[eventDetail.type] || C.teal, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>{eventDetail.type?.replace("-", " ")}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.textDark, marginBottom: 8, lineHeight: 1.3 }}>{eventDetail.title}</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>{eventDetail.date} · {eventDetail.time}</div>
            <div style={{ fontSize: 13, color: C.textMid, marginBottom: 16 }}>📍 {eventDetail.location}</div>
            <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7, margin: "0 0 22px" }}>{eventDetail.desc}</p>
            <button onClick={() => setEventDetail(null)} style={{ background: CAT_COLOR[eventDetail.type] || C.teal, color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 26, paddingBottom: 22, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "inline-block", background: `${C.teal}12`, border: `1px solid ${C.teal}30`, borderRadius: 100, padding: "3px 12px", fontSize: 9, fontWeight: 800, color: C.teal, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
          Communications
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 21, fontWeight: 800, color: C.textDark, letterSpacing: "-0.02em" }}>Company Updates</h2>
            <p style={{ margin: 0, color: C.textMuted, fontSize: 13 }}>Announcements, events, and milestones from across QumulusAI.</p>
          </div>
          <button onClick={() => setShowCreate(v => !v)} style={{ background: C.teal, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, minHeight: 44 }}>
            + Create Announcement
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.teal}`, borderRadius: 12, padding: 22, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark, marginBottom: 16 }}>New Announcement</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 180px", gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Title *</div>
              <input style={fieldStyle} placeholder="Announcement title…" value={newAnn.title} onChange={e => setNewAnn(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Category</div>
              <select style={fieldStyle} value={newAnn.category} onChange={e => setNewAnn(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.filter(c => c.id !== "all").map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Message *</div>
            <textarea style={{ ...fieldStyle, height: 120, resize: "vertical", lineHeight: 1.6 }} placeholder="Write your announcement…" value={newAnn.body} onChange={e => setNewAnn(p => ({ ...p, body: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCreate} disabled={!newAnn.title.trim() || !newAnn.body.trim()} style={{ background: C.teal, color: "#fff", border: "none", borderRadius: 7, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (!newAnn.title.trim() || !newAnn.body.trim()) ? 0.5 : 1 }}>
              Publish Announcement
            </button>
            <button onClick={() => setShowCreate(false)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 16px", fontSize: 13, color: C.textMuted, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 260px", gap: 16, alignItems: "start" }}>
        {/* Left: Announcements */}
        <div>
          {selected ? (
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.teal, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "0 0 18px", display: "flex", alignItems: "center", gap: 4 }}>← Back</button>
              <div style={{ fontSize: 10, fontWeight: 800, color: CAT_COLOR[selected.category] || C.teal, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{selected.category}</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: C.textDark, marginBottom: 8, lineHeight: 1.3 }}>{selected.title}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 22, paddingBottom: 18, borderBottom: `1px solid ${C.border}` }}>By {selected.author} · {selected.date}</div>
              <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.85, whiteSpace: "pre-line" }}>{selected.body}</div>
            </div>
          ) : (
            <>
              {/* Category filters */}
              <div style={{ overflowX: "auto", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 6, minWidth: "max-content" }}>
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setFilter(c.id)} style={{
                      background: filter === c.id ? C.teal : "transparent",
                      border: filter === c.id ? `1px solid ${C.teal}` : `1px solid ${C.border}`,
                      borderRadius: 100, padding: "6px 14px", fontSize: 12,
                      color: filter === c.id ? "#fff" : C.textMuted,
                      fontWeight: filter === c.id ? 700 : 400,
                      cursor: "pointer", fontFamily: "inherit", minHeight: 34,
                    }}>{c.label}</button>
                  ))}
                </div>
              </div>

              {pinned.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Pinned</div>
                  {pinned.map(ann => <AnnouncementCard key={ann.id} ann={ann} isRead={readIds.has(ann.id)} onClick={() => openAnn(ann)} />)}
                </div>
              )}

              <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                {filter === "all" ? "All Updates" : CATEGORIES.find(c => c.id === filter)?.label}
              </div>
              {rest.length === 0
                ? <div style={{ color: C.textMuted, fontSize: 13, padding: "20px 0" }}>No announcements in this category.</div>
                : rest.map(ann => <AnnouncementCard key={ann.id} ann={ann} isRead={readIds.has(ann.id)} onClick={() => openAnn(ann)} />)
              }
            </>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Upcoming Events */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Upcoming Events</div>
            {EVENTS.map((ev, i) => {
              const month = ev.date.slice(5, 7) === "07" ? "JUL" : "AUG";
              const day   = ev.date.slice(8);
              const color = CAT_COLOR[ev.type] || C.teal;
              return (
                <div key={ev.id} onClick={() => setEventDetail(ev)} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: i < EVENTS.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <div style={{ background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 6, padding: "4px 8px", textAlign: "center", flexShrink: 0, minWidth: 40 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color, letterSpacing: "0.05em" }}>{month}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color, lineHeight: 1.1 }}>{day}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.textDark, lineHeight: 1.3 }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{ev.time}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Milestones */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>July Milestones</div>
            {MILESTONES.map((m, i) => (
              <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < MILESTONES.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{m.type === "birthday" ? "🎂" : "🎉"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.textDark }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{m.label} · {m.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
