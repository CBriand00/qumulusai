import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { brand } from "./brand";

function renderMarkdown(text) {
  if (!text) return null;
  return text.split("\n").map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("### ")) return <h3 key={idx} style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "10px 0 3px" }}>{trimmed.slice(4)}</h3>;
    if (trimmed.startsWith("## "))  return <h2 key={idx} style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", margin: "12px 0 4px" }}>{trimmed.slice(3)}</h2>;
    if (trimmed === "---") return <hr key={idx} style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "8px 0" }} />;
    if (trimmed === "") return <div key={idx} style={{ height: 5 }} />;
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
    const formatted = parts.map((p, i) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p
    );
    return <p key={idx} style={{ margin: "1px 0", fontSize: 14, lineHeight: 1.65 }}>{formatted}</p>;
  });
}

const C = {
  bg:      "#F7F8FA",
  surface: "#FFFFFF",
  border:  "#E5E7EB",
  accent:  "#7C3AED",
  text:    "#0F172A",
  muted:   "#64748B",
  green:   "#16A34A",
};

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

// Bold the matched portion of a name/channel during quick-find.
function highlight(text, q) {
  const i = text.toLowerCase().indexOf(q);
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <strong style={{ color: "#7C3AED" }}>{text.slice(i, i + q.length)}</strong>
      {text.slice(i + q.length)}
    </>
  );
}

export default function Messenger() {
  const [channel, setChannel]     = useState("general");
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [input, setInput]         = useState("");
  const [name, setName]           = useState("");
  const [nameSet, setNameSet]     = useState(false);
  const [sending, setSending]     = useState(false);
  const [channels, setChannels]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selfEmpId, setSelfEmpId] = useState(null);
  const [onboardingChannels, setOnboardingChannels] = useState([]);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [quickFind, setQuickFind] = useState("");
  const [newChName, setNewChName] = useState("");
  const [newChDesc, setNewChDesc] = useState("");
  const [creating, setCreating]   = useState(false);
  const bottomRef                 = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("full_name").eq("id", user.id).single()
          .then(({ data }) => {
            const displayName = data?.full_name || user.email.split("@")[0];
            setName(displayName);
            setNameSet(true);
          });
        // Match the signed-in user to an employee record for DMs
        supabase.from("employees").select("id, email").eq("status", "active")
          .then(({ data }) => {
            const me = (data || []).find(e => e.email?.toLowerCase() === user.email?.toLowerCase());
            if (me) setSelfEmpId(me.id);
          });
      }
    });
  }, []);

  function loadChannels() {
    supabase.from("channels").select("*").order("created_at")
      .then(({ data }) => setChannels(data || []));
  }
  useEffect(() => { loadChannels(); }, []);

  useEffect(() => {
    supabase.from("employees").select("id, full_name, role_title").eq("status", "active").order("full_name")
      .then(({ data }) => setEmployees(data || []));
  }, []);

  useEffect(() => {
    // Find all onboarding channels dynamically
    supabase.from("messages")
      .select("channel")
      .like("channel", "onboarding-%")
      .then(({ data }) => {
        if (!data) return;
        const unique = [...new Set(data.map(m => m.channel))].sort().reverse();
        setOnboardingChannels(unique.map(id => ({
          id,
          label: (() => {
            const parts = id.replace("onboarding-", "").split("-");
            const dateParts = parts.slice(-3);
            const nameParts = parts.slice(0, -3);
            const name = nameParts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            const date = dateParts.length === 3
              ? new Date(`${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : dateParts.join("-");
            return `🎉 ${name} · ${date}`;
          })(),
          desc: "New hire onboarding coordination",
          isOnboarding: true,
        })));
      });
  }, []);

  // Fetch messages for current channel
  useEffect(() => {
    setLoading(true);
    supabase
      .from("messages")
      .select("*")
      .eq("channel", channel)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages(data ?? []);
        setLoading(false);
      });
  }, [channel]);

  // Real-time subscription
  useEffect(() => {
    const sub = supabase
      .channel("messages_" + channel)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel=eq.${channel}` },
        (payload) => setMessages((prev) => [...prev, payload.new])
      )
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [channel]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !nameSet) return;
    setSending(true);
    await supabase.from("messages").insert([{
      channel,
      sender_name: name,
      content: input.trim(),
    }]);
    setInput("");
    setSending(false);
  }

  async function createChannel() {
    const slug = slugify(newChName);
    if (!slug) return;
    setCreating(true);
    const { data, error } = await supabase.from("channels").insert({
      slug,
      name: slug,
      description: newChDesc.trim() || "Team channel",
      created_by: name,
    }).select().single();
    setCreating(false);
    if (error) {
      // Most likely a duplicate slug — just switch to it
      if (error.code === "23505") { setChannel(slug); setShowNewChannel(false); setNewChName(""); setNewChDesc(""); return; }
      return;
    }
    setShowNewChannel(false);
    setNewChName("");
    setNewChDesc("");
    loadChannels();
    if (data) setChannel(data.slug);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Direct-message channel slug: stable regardless of who opens it.
  function dmSlug(otherEmpId) {
    const self = selfEmpId || "me-" + slugify(name);
    return "dm-" + [self, otherEmpId].sort().join(".");
  }

  // Name setup screen
  if (!nameSet && !name) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, width: 360, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>
            {brand.wordmark.lead}{brand.wordmark.body}<span style={{ color: C.accent }}>{brand.wordmark.tail}</span> Messenger
          </div>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>What's your name? This will show on your messages.</p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setNameSet(true); }}
            placeholder="Your name…"
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none" }}
          />
          <button
            disabled={!name.trim()}
            onClick={() => setNameSet(true)}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: name.trim() ? 1 : 0.5 }}
          >
            Enter Messenger →
          </button>
        </div>
      </div>
    );
  }

  // Resolve the current channel's display info across all sources
  const dmPeers = employees.filter(e => e.id !== selfEmpId && e.full_name !== name);

  // Quick-find: filter channels, people, and onboarding threads together.
  const q = quickFind.trim().toLowerCase();
  const filteredChannels = q ? channels.filter(c => c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q)) : channels;
  const filteredPeers = q ? dmPeers.filter(e => e.full_name.toLowerCase().includes(q) || (e.role_title || "").toLowerCase().includes(q)) : dmPeers;
  const filteredOnboarding = q ? onboardingChannels.filter(c => c.label.toLowerCase().includes(q)) : onboardingChannels;
  const noMatches = q && filteredChannels.length === 0 && filteredPeers.length === 0 && filteredOnboarding.length === 0;
  const chRow = channels.find(c => c.slug === channel);
  const obRow = onboardingChannels.find(c => c.id === channel);
  const dmPeer = channel.startsWith("dm-") ? dmPeers.find(e => channel.includes(e.id)) : null;
  const headerLabel = chRow ? `# ${chRow.name}` : obRow ? obRow.label : dmPeer ? `@ ${dmPeer.full_name}` : `# ${channel}`;
  const headerDesc  = chRow ? chRow.description : obRow ? obRow.desc : dmPeer ? `Direct message · ${dmPeer.role_title}` : "";

  const chanBtn = (active) => ({
    display: "block", width: "100%", textAlign: "left",
    padding: "8px 12px", borderRadius: 8, border: "none",
    background: active ? C.accent + "20" : "transparent",
    color: active ? C.text : C.muted,
    fontSize: 13, fontWeight: active ? 600 : 400,
    cursor: "pointer", marginBottom: 2, fontFamily: "inherit",
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", height: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>

      {/* Sidebar */}
      <aside style={{ borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: C.surface }}>
        <div style={{ padding: "24px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {brand.wordmark.lead}{brand.wordmark.body}<span style={{ color: C.accent }}>{brand.wordmark.tail}</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Messenger</div>
        </div>

        {/* User badge */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.accent + "30", color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
            {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{name}</div>
            <div style={{ fontSize: 11, color: C.green, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
              Active
            </div>
          </div>
        </div>

        {/* Quick find */}
        <div style={{ padding: "12px 12px 0" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 13, pointerEvents: "none" }}>⌕</span>
            <input
              value={quickFind}
              onChange={e => setQuickFind(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") setQuickFind(""); }}
              placeholder="Find people or channels…"
              style={{ width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 26px 8px 28px", fontSize: 12.5, color: C.text, outline: "none", fontFamily: "inherit" }}
            />
            {quickFind && (
              <button onClick={() => setQuickFind("")} title="Clear"
                style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 2, fontFamily: "inherit" }}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Channels */}
        <div style={{ padding: "16px 12px 8px", overflowY: "auto", flex: 1 }}>
          {noMatches && (
            <div style={{ padding: "16px 8px", fontSize: 12.5, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
              No people or channels match "{quickFind}".
            </div>
          )}
          <div style={{ display: (q && filteredChannels.length === 0) ? "none" : "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px 8px" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em" }}>CHANNELS</span>
            <button onClick={() => setShowNewChannel(v => !v)} title="Create a new channel"
              style={{ background: showNewChannel ? C.accent : C.accent + "18", color: showNewChannel ? "#fff" : C.accent, border: "none", borderRadius: 6, width: 20, height: 20, fontSize: 14, fontWeight: 700, cursor: "pointer", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>
              +
            </button>
          </div>

          {showNewChannel && (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, marginBottom: 10 }}>
              <input
                autoFocus
                value={newChName}
                onChange={e => setNewChName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createChannel(); if (e.key === "Escape") setShowNewChannel(false); }}
                placeholder="channel-name"
                style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit", marginBottom: 6 }}
              />
              <input
                value={newChDesc}
                onChange={e => setNewChDesc(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createChannel(); }}
                placeholder="What's it about? (optional)"
                style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", fontSize: 12, color: C.text, outline: "none", fontFamily: "inherit", marginBottom: 8 }}
              />
              {newChName && <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 8 }}>Will be created as <strong># {slugify(newChName)}</strong></div>}
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={createChannel} disabled={!slugify(newChName) || creating}
                  style={{ flex: 1, background: C.accent, color: "#fff", border: "none", borderRadius: 7, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: slugify(newChName) ? 1 : 0.5, fontFamily: "inherit" }}>
                  {creating ? "Creating…" : "Create"}
                </button>
                <button onClick={() => { setShowNewChannel(false); setNewChName(""); setNewChDesc(""); }}
                  style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {filteredChannels.map((ch) => (
            <button key={ch.slug} onClick={() => setChannel(ch.slug)} style={chanBtn(channel === ch.slug)}>
              # {q ? highlight(ch.name, q) : ch.name}
            </button>
          ))}

          {/* Direct messages */}
          {filteredPeers.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", padding: "14px 8px 8px" }}>DIRECT MESSAGES</div>
              {filteredPeers.map((emp) => {
                const slug = dmSlug(emp.id);
                const active = channel === slug;
                return (
                  <button key={emp.id} onClick={() => setChannel(slug)}
                    style={{ ...chanBtn(active), display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: active ? C.accent + "30" : C.border, color: active ? C.accent : C.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, flexShrink: 0 }}>
                      {emp.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                    <span style={{ overflow: "hidden", minWidth: 0 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q ? highlight(emp.full_name, q) : emp.full_name}</span>
                      {q && <span style={{ display: "block", fontSize: 10.5, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.role_title}</span>}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {filteredOnboarding.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", padding: "14px 8px 8px" }}>NEW HIRE ONBOARDING</div>
              {filteredOnboarding.map((ch) => (
                <button key={ch.id} onClick={() => setChannel(ch.id)} style={{
                  ...chanBtn(channel === ch.id),
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.label}</span>
                  <span style={{ fontSize: 9, background: "#16A34A", color: "#fff", borderRadius: 4, padding: "1px 5px", fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0, marginLeft: 6 }}>NEW</span>
                </button>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{headerLabel}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{headerDesc}</div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 4 }}>
          {loading && <div style={{ color: C.muted, fontSize: 13 }}>Loading messages…</div>}
          {!loading && messages.length === 0 && (
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center", marginTop: 48 }}>
              {dmPeer ? `This is the beginning of your conversation with ${dmPeer.full_name}.` : "No messages yet. Be the first to say something!"}
            </div>
          )}
          {messages.map((msg, i) => {
            const prev = messages[i - 1];
            const showName = !prev || prev.sender_name !== msg.sender_name;
            const time = new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
            const initials = msg.sender_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            const isMe = msg.sender_name === name;

            return (
              <div key={msg.id} style={{ display: "flex", gap: 12, marginTop: showName ? 16 : 2 }}>
                {showName ? (
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: isMe ? C.accent + "20" : C.border, color: isMe ? C.accent : C.muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                    {initials}
                  </div>
                ) : (
                  <div style={{ width: 36, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  {showName && (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: isMe ? C.accent : C.text }}>{msg.sender_name}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{time}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{renderMarkdown(msg.content)}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Message ${headerLabel}…`}
              rows={1}
              style={{ flex: 1, background: "transparent", border: "none", color: C.text, fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.5 }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: input.trim() ? 1 : 0.4, flexShrink: 0 }}
            >
              Send
            </button>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Press Enter to send · Shift+Enter for new line</div>
        </div>
      </div>
    </div>
  );
}
