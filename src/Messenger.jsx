import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
const STATIC_CHANNELS = [
  { id: "general",    label: "# general",    desc: "Company-wide announcements and conversation" },
  { id: "recruiting", label: "# recruiting", desc: "Hiring updates, candidate discussions" },
  { id: "engineering",label: "# engineering",desc: "Tech talk, infrastructure, and builds" },
  { id: "sales",      label: "# sales",      desc: "Deals, pipeline, and revenue updates" },
];

const C = {
  bg:      "#F7F8FA",
  surface: "#FFFFFF",
  border:  "#E5E7EB",
  accent:  "#7C3AED",
  text:    "#0F172A",
  muted:   "#64748B",
  green:   "#16A34A",
};

export default function Messenger() {
  const [channel, setChannel]     = useState("general");
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [input, setInput]         = useState("");
  const [name, setName]           = useState("");
  const [nameSet, setNameSet]     = useState(false);
  const [sending, setSending]     = useState(false);
  const [onboardingChannels, setOnboardingChannels] = useState([]);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("profiles").select("full_name").eq("id", user.id).single()
          .then(({ data }) => {
            const displayName = data?.full_name || user.email.split("@")[0];
            setName(displayName);
            setNameSet(true);
          });
      }
    });
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
          label: "🎉 " + id.replace("onboarding-", "").replace(/-/g, " "),
          desc: "New hire onboarding coordination",
          isOnboarding: true,
        })));
      });
  }, []);
  const bottomRef                 = useRef(null);

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

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Name setup screen
  if (!nameSet && !name) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, width: 360, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>
            Qumulus<span style={{ color: C.accent }}>AI</span> Messenger
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

  const ALL_CHANNELS = [...STATIC_CHANNELS, ...onboardingChannels];
  const currentChannel = ALL_CHANNELS.find((c) => c.id === channel);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", height: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>

      {/* Sidebar */}
      <aside style={{ borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: C.surface }}>
        <div style={{ padding: "24px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Qumulus<span style={{ color: C.accent }}>AI</span>
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

        {/* Channels */}
        <div style={{ padding: "16px 12px 8px", overflowY: "auto", flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", padding: "0 8px 8px" }}>CHANNELS</div>
          {STATIC_CHANNELS.map((ch) => (
            <button key={ch.id} onClick={() => setChannel(ch.id)} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "8px 12px", borderRadius: 8, border: "none",
              background: channel === ch.id ? C.accent + "20" : "transparent",
              color: channel === ch.id ? C.text : C.muted,
              fontSize: 13, fontWeight: channel === ch.id ? 600 : 400,
              cursor: "pointer", marginBottom: 2, fontFamily: "inherit",
            }}>
              {ch.label}
            </button>
          ))}
          {onboardingChannels.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", padding: "12px 8px 8px" }}>NEW HIRE ONBOARDING</div>
              {onboardingChannels.map((ch) => (
                <button key={ch.id} onClick={() => setChannel(ch.id)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", textAlign: "left",
                  padding: "8px 12px", borderRadius: 8, border: "none",
                  background: channel === ch.id ? C.accent + "20" : "transparent",
                  color: channel === ch.id ? C.text : C.muted,
                  fontSize: 13, fontWeight: channel === ch.id ? 600 : 400,
                  cursor: "pointer", marginBottom: 2, fontFamily: "inherit",
                }}>
                  <span>{ch.label}</span>
                  <span style={{ fontSize: 9, background: "#16A34A", color: "#fff", borderRadius: 4, padding: "1px 5px", fontWeight: 700, letterSpacing: "0.05em" }}>NEW</span>
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
          <div style={{ fontWeight: 700, fontSize: 16 }}>{currentChannel?.label}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{currentChannel?.desc}</div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 4 }}>
          {loading && <div style={{ color: C.muted, fontSize: 13 }}>Loading messages…</div>}
          {!loading && messages.length === 0 && (
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center", marginTop: 48 }}>
              No messages yet. Be the first to say something!
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
                  <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{msg.content}</div>
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
              placeholder={`Message ${currentChannel?.label}…`}
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
