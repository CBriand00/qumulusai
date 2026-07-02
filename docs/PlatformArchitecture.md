# QumulusAI Platform Architecture

> **Last updated:** July 2026  
> **Status:** Living document — update when the module contract changes, not when modules are added.

---

## 1. Mental Model

The platform is a shell + a registry. The shell (`App.jsx`, `CommandCenter.jsx`) renders whatever modules are registered. A module is just an object that satisfies the **Module Contract** below and registers itself through `src/services/registerModules.js`. Everything else — nav, AI briefing, dashboard widgets, RBAC filtering — is driven automatically from that registration.

**Consequence:** Adding a new module is additive work. It never requires modifying the shell, the nav array, or the AI orchestrator. Removing or gating a module is one line in `registerModules.js`.

---

## 2. Directory Layout

```
src/
  App.jsx                     # Shell: nav, routing, auth gate, role check
  CommandCenter.jsx           # AI Command Center UI (reads from registry)
  useBreakpoint.js            # Shared responsive hook — isMobile / isTablet
  supabase.js                 # Supabase client (anon key, browser-safe)

  services/
    intelligenceEngine.js     # Registry, AI orchestration, briefing engine
    registerModules.js        # Single file that calls registerModule() for every active module
    services.js               # All service objects (the data + AI layer per module)

  [ModuleName].jsx            # Each module's UI component

supabase/
  functions/
    ai-query/                 # Proxy to Anthropic — all AI calls route here
    [module-name]/            # One edge function per module action

docs/
  PlatformArchitecture.md     # This file
  PlatformRoadmap.md          # Module status and sequencing
```

---

## 3. The Module Contract

Every module is a plain JS object. To be registered it must satisfy this interface:

```js
{
  // Required
  id:   string,          // Unique snake_case identifier: "hiring", "workforce", etc.
  name: string,          // Display name: "Hiring Intelligence"

  async getSummary(): string,
  // Returns a 1-2 sentence plain-text summary of current module state.
  // Called every time the AI Chief of Staff builds a briefing.
  // Must never throw — catch internally and return "No data available."

  // Optional but strongly recommended
  async getMetrics(): object,
  // Returns structured data for dashboard widgets.
  // Shape is module-specific; document it in the service file.

  async getRecentActivity(hours: number): object,
  // Returns activity in the last N hours for the briefing's "what changed" section.
  // Return { items: [] } if not implemented yet.

  // Coming Soon modules — implement these as stubs that return empty data.
  // Do NOT omit them; the orchestrator calls them unconditionally.
}
```

### Registering a module

Add one line to `src/services/registerModules.js`:

```js
import { newModuleService } from "./services";

export function ensureModulesRegistered() {
  if (registered) return;
  registerModule(hiringService);
  // ...existing modules...
  registerModule(newModuleService);   // ← add here
  registered = true;
}
```

That's it. The AI Chief of Staff, the Q&A engine, and any future dashboard widget system all pick it up automatically.

---

## 4. AI Orchestration Layer (`intelligenceEngine.js`)

The orchestrator does three things:

### 4a. Context building
On every AI call, it calls `getSummary()` on every registered module in parallel, joins the results, and injects them into the system prompt. The AI always has live data from every module the user has permission to see.

```js
async function buildContext() {
  const summaries = await Promise.all(
    registry.map(async (m) => {
      try { return `[${m.name}]\n${await m.getSummary()}`; }
      catch (e) { return `[${m.name}]\nNo data available.`; }
    })
  );
  return summaries.join("\n\n");
}
```

### 4b. Free-form Q&A (`askIntelligenceEngine`)
Takes a natural-language question, injects full context, returns an answer. Used by the "Ask Your Chief of Staff" input in CommandCenter.

### 4c. Personalized daily briefing (`getChiefOfStaffBriefing`)
Accepts `userRole` and selects a role-specific focus prompt from `ROLE_PROMPTS`. Also calls `getRecentActivity(24)` on every module. Produces the "Today's Briefing" card.

**Role prompts defined:** `ceo`, `executive`, `chro`, `hr`, `recruiter`, `manager`, `default`.

---

## 5. AI Call Path

All AI calls (browser and edge functions) go through one gateway:

```
Browser → supabase.functions.invoke("ai-query") → Anthropic API
Edge fn → fetch("${SUPABASE_URL}/functions/v1/ai-query") → Anthropic API
```

`ai-query` is the only function that holds `ANTHROPIC_API_KEY`. No other function or client-side code calls Anthropic directly.

**Exception:** `generate-assessment` currently calls Anthropic directly using `ANTHROPIC_API_KEY` because it's a self-contained edge function. This should be normalized to go through `ai-query` when the assessment flow is stable.

---

## 6. Database Conventions

| Convention | Rule |
|---|---|
| Primary keys | `UUID DEFAULT gen_random_uuid()` |
| Org scoping | Every table has `organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'` |
| Timestamps | `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()` |
| RLS | Enabled on every table. Default policy: `FOR ALL USING (true)` until RBAC is module-complete |
| Table names | `snake_case`, plural |
| FK references | Always `ON DELETE CASCADE` unless there's a documented reason not to |

### Exposed tables (Supabase Data API)
Every table used by the browser client must be added to **Supabase → Integrations → Data API → Exposed tables**. The edge functions bypass this via the service role key.

---

## 7. Authentication & RBAC

Auth is handled in `Auth.jsx` using Supabase Auth. On login, `userRole` is read from the `profiles` table (`role` column).

**Defined roles:** `ceo`, `executive`, `chro`, `hr`, `recruiter`, `manager`, `employee`

The `employee` role is special: it bypasses the main shell entirely and renders `<EmployeePortal />`. All other roles see the full platform with role-appropriate filtering.

**Role-aware rendering** happens in two places:
1. `CommandCenter.jsx` — hides/shows widgets and personalizes the briefing based on `userRole`
2. `App.jsx` — the `employee` role redirect

Future RBAC should be enforced at the service layer (row-level in Supabase policies), not just the UI.

---

## 8. Edge Functions

| Function | Purpose | Auth |
|---|---|---|
| `ai-query` | Anthropic proxy | anon key (public) |
| `create-employee-login` | Creates Supabase auth user + profile | service role key |
| `generate-assessment` | Generates candidate assessment questions, inserts to DB, sends email | anon key |
| `score-assessment` | Scores submitted responses, updates application status | anon key |
| `source-candidates` | AI candidate sourcing via web search | anon key |

### Edge function conventions
- Always handle `OPTIONS` preflight first
- CORS headers on every response: `Access-Control-Allow-Origin: *`
- All env vars: `SUPABASE_ANON_KEY`, `SUPABASE_URL`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (last one: never expose to browser)
- All DB writes from edge functions use the REST API (`fetch` to `/rest/v1/`) with the anon key — do not import `@supabase/supabase-js` in edge functions unless `SERVICE_ROLE_KEY` is genuinely required
- Wrap the entire handler body in `try/catch` and return `{ error, message, stack }` on failure

---

## 9. Responsive / Mobile Layer

All UI uses the `useBreakpoint()` hook (`src/useBreakpoint.js`):

```js
const { isMobile, isTablet } = useBreakpoint();
```

- `isMobile`: `< 768px`
- `isTablet`: `768px – 1023px`

**Rules:**
- No fixed pixel widths on layout containers — use `flex`, `grid`, `100%`, `max-width`
- Touch targets: `min-height: 44px` on all interactive elements
- Horizontal overflow: any wide content (tables, tab bars) gets `overflow-x: auto` on a wrapper, never on `body`
- Mobile nav: slide-out drawer via `sidebarOpen` state in `App.jsx`

---

## 10. Styling Conventions

All styling is inline CSS-in-JS. The design token object `C` is defined at the top of each file that needs it:

```js
const C = {
  bg:        "#F0F2F7",   // page background
  bgCard:    "#FFFFFF",   // card surface
  textDark:  "#0D1117",
  textMid:   "#3D4B5C",
  textMuted: "#7E8FA3",
  border:    "#DDE3ED",
  cyan:      "#00C2E0",   // primary accent
  navy:      "#0A2540",   // dark accent / sidebar
  // module-specific accents declared alongside
};
```

The sidebar and auth screens use a dark theme (`bgSidebar: "#080D1A"`). Everything else is light.

---

## 11. Token Routing (Deep Links)

Certain flows bypass auth and render a standalone page based on a URL parameter:

| Parameter | Component | Use case |
|---|---|---|
| `?sign=TOKEN` | `<OfferSigning />` | Candidate signs offer letter |
| `?onboard=TOKEN` | `<NewHirePortal />` | New hire completes onboarding docs |
| `?assess=TOKEN` | `<AssessmentPortal />` | Candidate completes skills assessment |

These are checked in `App.jsx` before the auth gate, so unauthenticated users can access them:

```js
const params = new URLSearchParams(window.location.search);
const assessToken = params.get("assess");
if (assessToken) return <AssessmentPortal token={assessToken} />;
```

---

## 12. Adding a New Module — Checklist

1. **Schema** — write `CREATE TABLE` SQL with org_id, RLS, standard columns. Run in Supabase SQL Editor. Expose the table in Data API.
2. **Service object** — add to `src/services/services.js`. Implement `id`, `name`, `getSummary()`, `getMetrics()`, `getRecentActivity()`.
3. **Register** — add `registerModule(yourService)` to `src/services/registerModules.js`.
4. **UI component** — create `src/YourModule.jsx`. Use `useBreakpoint()` and the `C` token object.
5. **Nav entry** — add to the `NAV` array in `App.jsx` and the `screens` map.
6. **Edge functions** — create under `supabase/functions/your-module-action/index.ts` following the conventions in §8.
7. **Dashboard widgets** — add `<Widget>` entries to `CommandCenter.jsx` that read from your service's `getMetrics()`.

**Coming Soon stub:** Steps 1–3 only, with `getSummary()` returning `"[Module name]: coming soon."` and `getMetrics()` returning `{}`. The module appears in the AI context immediately, costs nothing at runtime, and flipping it live later is additive.
