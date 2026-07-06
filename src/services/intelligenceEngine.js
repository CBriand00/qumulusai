import { supabase } from "../supabase";
import { brand } from "../brand";

const registry = [];

export function registerModule(module) {
  if (!module.id || !module.getSummary) throw new Error("Module must have { id, getSummary }");
  registry.push(module);
}

export function getRegisteredModules() { return registry; }

async function callAI({ system, messages, max_tokens }) {
  const { data, error } = await supabase.functions.invoke("ai-query", {
    body: { system, messages, max_tokens },
  });
  if (error) throw error;
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  return data?.content?.[0]?.text || "";
}

async function buildContext() {
  const summaries = await Promise.all(
    registry.map(async (m) => {
      try { return `[${m.name}]\n${await m.getSummary()}`; }
      catch (e) { return `[${m.name}]\nNo data available.`; }
    })
  );
  return summaries.join("\n\n");
}

const BASE_SYSTEM = `You are the AI Chief of Staff for ${brand.name}'s People Operating System. You have live data from every connected module. Be honest about what is and isn't known. Keep responses under 200 words unless asked for more.`;

export async function askIntelligenceEngine(question) {
  const context = await buildContext();
  return callAI({
    system: `${BASE_SYSTEM}\n\nCurrent live data:\n\n${context}`,
    messages: [{ role: "user", content: question }],
  });
}

const ROLE_PROMPTS = {
  ceo:       "Focus on: workforce costs, headcount growth, flight risk, executive hiring, and strategic risks. Skip operational details.",
  executive: "Focus on: workforce costs, headcount growth, flight risk, executive hiring, and strategic risks. Skip operational details.",
  chro:      "Focus on: recruiting pipeline, retention risks, compliance alerts, engagement scores, and people strategy.",
  hr:        "Focus on: recruiting pipeline, retention risks, compliance alerts, engagement scores, and people strategy.",
  recruiter: "Focus on: open requisitions, candidates by stage, interviews scheduled today, offers pending, and time-to-fill trends.",
  manager:   "Focus on: team health, direct report flight risk, goal completion, upcoming interviews for open roles, and any performance alerts.",
  default:   "Give a comprehensive executive briefing covering all modules.",
};

export async function getChiefOfStaffBriefing(userRole = "executive") {
  const context = await buildContext();
  const recentActivity = await Promise.all(
    registry.map(async (m) => {
      if (!m.getRecentActivity) return null;
      try { return `[${m.name} - last 24h]\n${JSON.stringify(await m.getRecentActivity(24))}`; }
      catch (e) { return null; }
    })
  );
  const roleContext = ROLE_PROMPTS[userRole] || ROLE_PROMPTS.default;
  return callAI({
    system: `${BASE_SYSTEM}\n\nYou are briefing a ${userRole.toUpperCase()}.\n${roleContext}\n\nLive data:\n\n${context}\n\nLast 24h:\n\n${recentActivity.filter(Boolean).join("\n\n") || "No recent activity."}`,
    messages: [{ role: "user", content: "Give me my personalized briefing. What changed since yesterday, what needs my attention today, and what risks or opportunities should I know about?" }],
  });
}

export { callAI };
