# QumulusAI Platform Roadmap

> **Last updated:** July 2026  
> Status legend: ✅ Built · 🚧 In Progress · ⏳ Stubbed / Coming Soon

For the architectural pattern every module follows, see [`docs/PlatformArchitecture.md`](./PlatformArchitecture.md).

---

## Tier 0 — Thursday Demo Sprint (P0)

### AI Command Center — 🚧 Hardening
**File:** `src/CommandCenter.jsx`  
**Purpose:** Single conversational + visual entry point into the whole platform. Live cross-module status, natural-language Q&A across all data the signed-in user has permission to see, quick actions routed to the right module.  
**What's built:** Full UI, role-based greeting + briefing, widget grid (hiring, workforce, engagement, onboarding counts), Retention/Performance/Compliance/Financial cards with click-to-message, HR Alerts notification feed.  
**Remaining:** Widget drill-downs, exportable snapshots for board updates.  
**Dependencies:** `core.ai-orchestrator` (live), `core.identity` (live).

---

### AI Chief of Staff — ✅
**File:** `src/services/intelligenceEngine.js`  
**Purpose:** Proactive AI assistant that surfaces what needs attention and can act (draft, schedule, generate, notify) across modules.  
**What's built:** Daily briefing, role-personalized focus (7 roles), cross-module context injection, `askIntelligenceEngine` Q&A, `getChiefOfStaffBriefing` with 24h recent activity.  
**Remaining:** Tool-calling into module actions (draft an offer, schedule an interview) — currently briefing-only.  
**Dependencies:** All registered services.

---

### Recruiting Engine — 🚧 Assessment flow in progress
**Files:** `src/App.jsx` (RecruitingEngine, RequisitionsTab), `src/TalentInbox.jsx`, `src/Careers.jsx`, `src/AssessmentPortal.jsx`  
**Edge functions:** `generate-assessment`, `score-assessment`, `source-candidates`  
**Purpose:** End-to-end hiring: sourcing, assessments, interviews, offers.  
**What's built:** AI Intake Intelligence, AI Sourcing, Candidate Evaluator, Interview Intelligence, Interview Notetaker, Offer Letter generation, pipeline status management, Requisitions CRUD, `?assess=TOKEN` candidate portal, assessment results in Talent Inbox, AI screening result on Careers portal.  
**Remaining:** Assessment email delivery (`send-offer-email` integration), assessment scoring results surfacing reliably in Talent Inbox (pending DB schema fix — drop FK constraint on `candidate_assessments.application_id`), `score-assessment` end-to-end flow.  
**DB fix required:**
```sql
ALTER TABLE candidate_assessments
DROP CONSTRAINT IF EXISTS candidate_assessments_application_id_fkey;
```
**Dependencies:** `core.identity`, `core.messaging` (for email).

---

### Executive Dashboard — 🚧
**File:** `src/CommandCenter.jsx` (widget grid section)  
**Purpose:** Real-time leadership view of headcount, hiring, org health, and risk.  
**What's built:** Live metric widgets for all 6 registered modules, role-based widget visibility.  
**Remaining:** Drill-down into any metric, exportable board snapshot, department-level breakdown charts.  
**Dependencies:** All registered services with `getMetrics()`.

---

### Mobile Redesign — ✅
**Files:** `src/App.jsx`, `src/useBreakpoint.js`, all module UIs  
**What's built:** Slide-out drawer nav, sticky mobile top bar, single-column responsive layouts, 44px touch targets, horizontal scroll on wide content, `isMobile`/`isTablet` hook used throughout.

---

### Enterprise Authentication — ✅
**File:** `src/Auth.jsx`  
**What's built:** Supabase Auth login/signup, role assignment from `profiles` table, session persistence, `employee` role → EmployeePortal redirect, role-aware rendering throughout the shell.  
**Remaining:** SSO/SAML providers, MFA enforcement.

---

### Security Center — ✅
**File:** `src/SecurityActivity.jsx`  
**What's built:** Access event log, session management view, permission change history (reads from `audit_log`).

---

## Tier 1 — Next Up (P1)

### Onboarding — ✅
**Files:** `src/NewHirePortal.jsx`, `src/App.jsx` (OnboardingConcierge), `supabase/functions/create-employee-login/`  
**What's built:** `?onboard=TOKEN` new hire portal, document checklist, onboarding channel creation in Messenger, AI 30-60-90 day plan generation per employee, auto-created Supabase auth account for new hire on portal trigger, live `employee_onboarding_docs` data with pending-doc count in Command Center.

---

### Internal Messenger — ✅
**File:** `src/Messenger.jsx`  
**What's built:** Native messaging, channel list, onboarding automation triggers, assessment notification messages.

---

### Employee Directory — ⏳
**Planned files:** `src/EmployeeDirectory.jsx`, `src/services/services.js` (directoryService)  
**Purpose:** Searchable record of all employees with role, team, department, and contact info.  
**Why it matters:** The "who is this person" lookup that most Tier 2/3 modules reference. EmployeeHub, OnboardingConcierge, and the retention/compliance cards already query `employees` directly — the Directory centralizes and standardizes that.  
**Stub to add:**
```js
export const directoryService = {
  id: "directory", name: "Employee Directory",
  async getSummary() { return "Employee Directory: coming soon."; },
  async getMetrics() { return {}; },
  async getRecentActivity() { return { items: [] }; },
};
```

---

### Organizational Chart — ⏳
**Planned files:** `src/OrgChart.jsx`  
**Purpose:** Visual reporting structure derived from Employee Directory data.  
**Dependencies:** `employee_directory` (must exist first).

---

### Workforce Analytics — ⏳
**Planned files:** `src/WorkforceAnalytics.jsx`, `src/services/services.js` (analyticsService)  
**Purpose:** Cross-module reporting and trend analysis — attrition, time-to-hire, engagement over time.  
**Dependencies:** Most other modules (reads, doesn't own data). No schema of its own.

---

## Tier 2 — Core HR Operations (P2)

### Performance Management — ⏳
**Partial foundation exists:** `goals` and `performance_reviews` tables are live, `performanceService` is registered, EmployeeHub has a performance notes UI.  
**What's needed:** Full review cycle management, peer feedback, OKR tracking UI, AI-assisted feedback drafting.

---

### Workforce Management — ⏳
**Purpose:** Scheduling, shift management, headcount planning.  
**Dependencies:** `employee_directory`.

---

### Learning & Training Portal (LMS) — ⏳
**Purpose:** Course delivery, certifications, compliance training. AI-generated learning paths.  
**Partial foundation exists:** `certifications` and `training_records` tables are live (used by `complianceService`).  
**Dependencies:** `employee_directory`.

---

### Workflow Automation — ⏳
**Purpose:** No-code trigger/action builder across modules. Example: "When candidate status → hired, trigger onboarding + notify IT."  
**Why it matters:** Unlocks compounding value across every module once live — replaces the manual `supabase.functions.invoke()` calls scattered across the codebase.  
**Dependencies:** `core.ai-orchestrator`. Each module will need to declare `aiTools` in its manifest for the automation builder to discover them.

---

### Compliance Center — ⏳
**Partial foundation exists:** `complianceService` is registered, reads `required_documents` and `certifications`, surfaces missing docs with clickable names in Command Center.  
**What's needed:** Full compliance center UI, policy distribution + sign-off tracking, audit-readiness reports.  
**Dependencies:** `core.audit`.

---

### AI Governance & Trust Center — ⏳
**Purpose:** Transparency and control over AI usage — model usage logs, bias/fairness monitoring, per-module AI tool permissioning review.  
**Why it matters:** Increasingly a requirement in enterprise HR software procurement.  
**Dependencies:** `core.ai-orchestrator`, `core.audit`.

---

## Tier 3 — Extended Platform (P3)

### Benefits Administration — ⏳
**Dependencies:** `employee_directory`, future carrier APIs.

### Payroll — ⏳
**Note:** Highest compliance/regulatory risk. Warrants a dedicated security + design review before implementation begins, not just a stub. Do not build until Tier 2 is stable.  
**Dependencies:** `employee_directory`, `time_attendance`, external payroll provider API.

### Time & Attendance — ⏳
**Dependencies:** `employee_directory`.

### Market Intelligence — ⏳
**Purpose:** Compensation benchmarking, labor market trends to support Recruiting and Performance decisions.  
**Dependencies:** External data providers (Bureau of Labor Statistics, Levels.fyi, Glassdoor API), `recruiting`.

### Employee Self-Service Portal — ⏳
**Purpose:** Single employee-facing UI for PTO requests, benefits, pay stubs, documents.  
**Note:** Natural capstone — only valuable once Benefits, Payroll, and Time & Attendance exist.  
**Partial foundation exists:** `src/EmployeePortal.jsx` (the `employee` role landing page).  
**Dependencies:** Tier 2 + Tier 3 modules.

---

## Currently Registered Services (AI Context)

These modules are live in the registry and inject data into every AI response:

| Service ID | File | `getSummary` source tables |
|---|---|---|
| `hiring` | `services.js` | `applications`, `offers`, `interviews` |
| `workforce` | `services.js` | `employees`, `departments`, `employee_onboarding_docs` |
| `retention` | `services.js` | `flight_risk_scores`, `engagement_scores` |
| `performance` | `services.js` | `goals` |
| `financial` | `services.js` | `labor_costs` |
| `compliance` | `services.js` | `required_documents`, `certifications` |

---

## Sequencing Logic

1. **Finish Tier 0** — fix the assessment FK constraint, confirm assessment email delivery, smoke-test scoring end-to-end. Everything else in Thursday's demo depends on Recruiting working.
2. **Employee Directory first in Tier 1** — it's the dependency that unlocks Org Chart and raises the quality ceiling on every module that references employees. Cheap to build (one service object + one UI), high leverage.
3. **Workflow Automation before deep Tier 2** — once automation exists, Onboarding, Compliance, and Performance can share event triggers rather than hardcoding `invoke()` calls.
4. **Payroll last** — it carries the most compliance risk and external integration complexity. Build it when the platform is otherwise stable, with a dedicated security pass.
