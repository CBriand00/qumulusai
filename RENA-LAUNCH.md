# Rena Labs — Launch Runbook

Everything needed to stand up **Rena Labs & Manufacturing** as its own deployment
of this platform. Rena gets its **own GitHub repo, own Supabase project, and own
Vercel deployment** — this is a worked example of the generic process in
`SETUP.md`. Nothing here touches the QumulusAI deployment.

Rena facts used below:
- **Name:** Rena Labs · **Site:** https://www.rena-world.com
- **Business:** technology-driven contract manufacturer of oral / nicotine pouches (private label, OEM, custom), Dallas, TX
- **Colors:** dark blue `#0F2A52` · crimson `#C8102E` · white
- **CEO:** Timothy Zhao

---

## 0. Repo (already done)
`rena-labs` was created from the `qumulusai` template. If you ever recreate it:
GitHub → `qumulusai` → **Use this template** → new repo `rena-labs` (Private).

---

## 1. Rebrand the code — one script

Open **`rena-labs` → `< > Code` → Codespaces → Create codespace on main**, then
paste this whole block into the Codespace terminal. It sets the brand config,
page title, and recolors every screen (crimson/navy), then commits + pushes.

```bash
cat > src/brand.js <<'BRAND'
export const brand = {
  name:        "Rena Labs",
  wordmark:    { lead: "Rena", body: " ", tail: "Labs" },
  tagline:     "People Operating System",
  website:     "https://www.rena-world.com",
  support:     "people@rena-world.com",
  emailDomain: "rena-world.com",
  accent:      "#C8102E",
};

export const company = {
  name:        brand.name,
  description: "a technology-driven contract manufacturer of oral and nicotine pouches — private label, OEM, and custom development at pharmaceutical-grade standards",
  location:    "Dallas, Texas",
  mission:     "to deliver market-ready oral pouch products of the highest quality",
  ceo:         "Timothy Zhao",
  stage:       "founded in 2023 and scaling production after a $5M pre-Series A to build its Texas facility",
  roles:       "Manufacturing Technicians, Process & Automation Engineers, R&D Scientists, Quality & Regulatory, and Operations",
};

export const companyBlurb =
  `${company.name} is ${company.description}, based in ${company.location}. ` +
  `The company's mission is ${company.mission}. ${company.name} is ${company.stage}.` +
  (company.ceo ? ` CEO is ${company.ceo}.` : "") +
  ` Roles: ${company.roles}.`;
BRAND

sed -i 's#<title>QumulusAI</title>#<title>Rena Labs</title>#' index.html

find src -type f \( -name '*.jsx' -o -name '*.js' \) -exec sed -i -E \
  's/#7C3AED/#C8102E/Ig; s/#00C2E0/#C8102E/Ig; s/#00B8D4/#C8102E/Ig; s/#2563EB/#0F2A52/Ig; s/#0A2540/#0A1F3D/Ig; s/#F5F3FF/#FDECEE/Ig' {} +

git add -A
git commit -m "Rebrand to Rena Labs: brand config + crimson/navy palette"
git push
```

Color mapping (brand only — semantic status colors are left alone):
| From (QumulusAI) | To (Rena) | Meaning |
|---|---|---|
| `#7C3AED` violet, `#00C2E0`/`#00B8D4` cyan | `#C8102E` crimson | accent pop |
| `#2563EB` blue | `#0F2A52` dark blue | primary buttons/links |
| `#0A2540` navy | `#0A1F3D` | deep navy |
| green / amber / red | *unchanged* | success / warning / error |

---

## 2. Create Rena's Supabase project
New project in the Supabase dashboard → copy its **Project URL**, **anon key**,
**service_role key**, and **project ref**.

## 3. Copy the schema  ⚠️ the one real gotcha
The repo's `supabase/migrations/` are **incremental** — they extend tables that
were first created directly in QumulusAI's dashboard, so a fresh project has
nothing for them to build on. Copy QumulusAI's full schema first (laptop + the
Supabase CLI):

```bash
# Dump QumulusAI schema (structure only, no data)
supabase link --project-ref oomdaguzvdheotrkqdxs
supabase db dump --schema public -f schema.sql

# Load it into Rena
supabase link --project-ref <RENA_PROJECT_REF>
supabase db push          # or: psql "<RENA_DB_URL>" -f schema.sql
```
This recreates every table plus all the RLS / governance / HITL migrations
already applied to QumulusAI. Afterward, confirm **Advisors → Security** is clean.

## 4. Deploy edge functions + secrets
```bash
supabase functions deploy
supabase secrets set \
  ANTHROPIC_API_KEY="<your key>" \
  COMPANY_NAME="Rena Labs" \
  COMPANY_CONTEXT="a technology-driven contract manufacturer of oral and nicotine pouches, based in Dallas, Texas" \
  APP_URL="https://<rena-vercel-url>"
# optional — real candidate sourcing:
# supabase secrets set PDL_API_KEY="<pdl key>"
```

## 5. Deploy the frontend (Vercel)
- Import the **`rena-labs`** repo as a new Vercel project.
- Environment variables:
  - `VITE_SUPABASE_URL` = Rena's Project URL
  - `VITE_SUPABASE_ANON_KEY` = Rena's anon key
- Deploy → this is Rena's live link. Put that URL back into `APP_URL` (step 4).

## 6. Configure Auth
Supabase → **Authentication → URL Configuration** → set Site URL + redirect URLs
to Rena's Vercel domain. Customize the confirmation / reset email templates.

## 7. Replace demo content
- `src/Careers.jsx` → the `ROLES` array (swap QumulusAI's GPU roles for Rena's
  real openings).
- `supabase/seed.sql` → replace QumulusAI demo employees, or start empty.

## 8. Verify
Load the site → sign up / sign in → **Advisors → Security clean (RLS on)** →
try an AI feature (the Governance tab's AI Activity log should populate).

---

## Launch checklist
- [ ] Codespace rebrand script run + pushed (step 1)
- [ ] Rena Supabase project created (step 2)
- [ ] Schema copied from QumulusAI; Security Advisor clean (step 3)
- [ ] Edge functions deployed; `COMPANY_*` / `ANTHROPIC_API_KEY` secrets set (step 4)
- [ ] Vercel project deployed with `VITE_SUPABASE_*` (step 5)
- [ ] Auth URLs configured (step 6)
- [ ] `Careers.jsx` roles + seed replaced (step 7)
- [ ] Smoke-tested (step 8)
