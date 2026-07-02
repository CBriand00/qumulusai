import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_URL = "https://oomdaguzvdheotrkqdxs.supabase.co";
const ORG_ID = "00000000-0000-0000-0000-000000000001";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const JSON_HEADERS = { "Content-Type": "application/json", ...CORS };

// ── Supabase REST helper ───────────────────────────────────────────────────────
async function dbGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY!, Authorization: `Bearer ${ANON_KEY}` },
  });
  return res.json();
}

async function dbPost(table: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY!,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ── 2026 Federal Withholding — Percentage Method (semimonthly pay period) ─────
// Source: IRS Publication 15-T (2025 brackets, negligible 2026 adjustment).
// Standard deduction offset and bracket thresholds for a semimonthly period.

type FilingStatus = "single" | "married" | "head_of_household";

interface Bracket {
  floor: number;
  base: number;
  rate: number;
}

const BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [
    { floor: 0,      base: 0,        rate: 0.10 },
    { floor: 503,    base: 50.30,    rate: 0.12 },
    { floor: 1600,   base: 182.94,   rate: 0.22 },
    { floor: 3733,   base: 652.20,   rate: 0.24 },
    { floor: 7125,   base: 1466.18,  rate: 0.32 },
    { floor: 12742,  base: 3263.62,  rate: 0.35 },
    { floor: 15733,  base: 4310.47,  rate: 0.37 },
  ],
  married: [
    { floor: 0,      base: 0,        rate: 0.10 },
    { floor: 1006,   base: 100.60,   rate: 0.12 },
    { floor: 3200,   base: 365.08,   rate: 0.22 },
    { floor: 7467,   base: 1303.82,  rate: 0.24 },
    { floor: 14250,  base: 2931.74,  rate: 0.32 },
    { floor: 25483,  base: 6526.30,  rate: 0.35 },
    { floor: 31467,  base: 8620.70,  rate: 0.37 },
  ],
  head_of_household: [
    { floor: 0,      base: 0,        rate: 0.10 },
    { floor: 754,    base: 75.40,    rate: 0.12 },
    { floor: 2767,   base: 316.96,   rate: 0.22 },
    { floor: 4600,   base: 720.22,   rate: 0.24 },
    { floor: 7125,   base: 1326.22,  rate: 0.32 },
    { floor: 12742,  base: 3123.66,  rate: 0.35 },
    { floor: 15733,  base: 4170.81,  rate: 0.37 },
  ],
};

// Standard deduction amount per period (semimonthly = annual / 24).
// 2025: single $15,000, married/HOH $30,000 (new W-4 standard withholding allowance).
const STD_DEDUCTION_PER_PERIOD: Record<FilingStatus, number> = {
  single:             15000 / 24,
  married:            30000 / 24,
  head_of_household:  22500 / 24,
};

function computeFederalTax(params: {
  grossPerPeriod: number;
  periods: number;         // pay periods in the year (used to annualize W-4 step amounts)
  filing: FilingStatus;
  multipleJobs: boolean;
  dependentsCredit: number;  // W-4 Step 3 dollar amount (e.g. 2 kids = $4,000)
  otherIncome: number;       // W-4 Step 4a annual amount
  deductions: number;        // W-4 Step 4b annual extra deductions
  extraWithholding: number;  // W-4 Step 4c per-period amount
}): number {
  const {
    grossPerPeriod, periods, filing, multipleJobs,
    dependentsCredit, otherIncome, deductions, extraWithholding,
  } = params;

  // Step 1a: Adjusted wage = gross + other_income/periods - deductions/periods
  // (deductions shift is capped at zero — can't reduce below 0)
  const stdDed = STD_DEDUCTION_PER_PERIOD[filing];
  const otherIncomePerPeriod = otherIncome / periods;
  const deductionsPerPeriod  = deductions  / periods;

  // Tentative wage amount
  let wage = grossPerPeriod + otherIncomePerPeriod;

  // Apply W-4 step-4b additional deductions (on top of standard deduction)
  const extraDedPerPeriod = Math.max(0, deductionsPerPeriod - stdDed) > 0
    ? deductionsPerPeriod - stdDed
    : 0;
  wage = Math.max(0, wage - stdDed - extraDedPerPeriod);

  // Step 2 — multiple jobs: use half the bracket thresholds
  // (IRS method: treat as if single with half-width brackets)
  const brackets = BRACKETS[filing];
  let tentative = 0;

  if (multipleJobs) {
    // Use single brackets regardless of filing status when multiple jobs checked
    const singleBrackets = BRACKETS.single;
    const adjusted = wage / 2;
    tentative = applyBrackets(adjusted, singleBrackets) * 2;
  } else {
    tentative = applyBrackets(wage, brackets);
  }

  // Step 3 — dependent credit reduces withholding (annualized, then per-period)
  const creditPerPeriod = dependentsCredit / periods;
  tentative = Math.max(0, tentative - creditPerPeriod);

  // Step 4c — extra withholding added per period
  tentative += extraWithholding;

  return round2(Math.max(0, tentative));
}

function applyBrackets(wage: number, brackets: Bracket[]): number {
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (wage > brackets[i].floor) {
      return brackets[i].base + (wage - brackets[i].floor) * brackets[i].rate;
    }
  }
  return 0;
}

// ── FICA ──────────────────────────────────────────────────────────────────────
const SS_WAGE_BASE_ANNUAL = 176100; // 2025/2026 approximate
const SS_RATE             = 0.062;
const MEDICARE_RATE       = 0.0145;
const ADD_MEDICARE_RATE   = 0.009;  // on wages > $200K (single) / $250K (married)

function computeFICA(grossPerPeriod: number, ytdGrossBefore: number, filing: FilingStatus) {
  const ssWageBase  = SS_WAGE_BASE_ANNUAL;
  const addMedBase  = filing === "married" ? 250000 : 200000;

  // Social Security — stop at wage base
  const ssAlready   = Math.min(ytdGrossBefore, ssWageBase);
  const ssEligible  = Math.max(0, Math.min(ssWageBase - ssAlready, grossPerPeriod));
  const socialSecurity = round2(ssEligible * SS_RATE);

  // Medicare — always applies
  const medicare = round2(grossPerPeriod * MEDICARE_RATE);

  // Additional Medicare — 0.9% on wages above threshold
  const addMedAlready = Math.max(0, ytdGrossBefore - addMedBase);
  const addMedEligible = addMedAlready > 0
    ? grossPerPeriod
    : Math.max(0, ytdGrossBefore + grossPerPeriod - addMedBase);
  const addMedicare = round2(addMedEligible * ADD_MEDICARE_RATE);

  return { socialSecurity, medicare: round2(medicare + addMedicare) };
}

// ── Gross pay from annual salary ──────────────────────────────────────────────
function derivePeriodsFromDates(start: string, end: string): number {
  const days = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
  if (days <= 8)  return 52;  // weekly
  if (days <= 11) return 26;  // biweekly
  if (days <= 17) return 24;  // semimonthly
  if (days <= 21) return 24;  // semimonthly (longer half-months)
  return 12;                  // monthly
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();
    const { pay_period_start, pay_period_end, pay_date } = body;

    if (!pay_period_start || !pay_period_end || !pay_date) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: pay_period_start, pay_period_end, pay_date" }),
        { status: 400, headers: JSON_HEADERS },
      );
    }

    const periods = derivePeriodsFromDates(pay_period_start, pay_period_end);

    // ── 1. Fetch all active employees ─────────────────────────────────────────
    const employees = await dbGet(
      `employees?status=eq.active&organization_id=eq.${ORG_ID}&select=id,full_name,email,role_title,department_id`,
    );

    if (!Array.isArray(employees) || employees.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active employees found" }),
        { status: 400, headers: JSON_HEADERS },
      );
    }

    // ── 2. Fetch compensation bands (for salary lookup) ───────────────────────
    const bands = await dbGet(
      `compensation_bands?organization_id=eq.${ORG_ID}&select=role_title,min_salary,max_salary`,
    );
    const bandMap: Record<string, number> = {};
    if (Array.isArray(bands)) {
      for (const b of bands) {
        bandMap[b.role_title] = (b.min_salary + b.max_salary) / 2;
      }
    }

    // ── 3. Fetch W-4 data from employee_onboarding_docs ──────────────────────
    const docs = await dbGet(
      `employee_onboarding_docs?organization_id=eq.${ORG_ID}&select=employee_id,w4_filing_status,w4_multiple_jobs,w4_dependents,w4_other_income,w4_deductions,w4_extra_withholding`,
    );
    const w4Map: Record<string, {
      filing: FilingStatus;
      multipleJobs: boolean;
      dependentsCredit: number;
      otherIncome: number;
      deductions: number;
      extraWithholding: number;
    }> = {};
    if (Array.isArray(docs)) {
      for (const d of docs) {
        if (!d.employee_id) continue;
        const rawFiling = (d.w4_filing_status || "single").toLowerCase();
        const filing: FilingStatus =
          rawFiling === "married" || rawFiling === "married_jointly"
            ? "married"
            : rawFiling === "head_of_household"
            ? "head_of_household"
            : "single";
        w4Map[d.employee_id] = {
          filing,
          multipleJobs:     !!d.w4_multiple_jobs,
          dependentsCredit: Number(d.w4_dependents)       || 0,
          otherIncome:      Number(d.w4_other_income)     || 0,
          deductions:       Number(d.w4_deductions)       || 0,
          extraWithholding: Number(d.w4_extra_withholding)|| 0,
        };
      }
    }

    // ── 4. Fetch most recent pay_stub YTD totals per employee ─────────────────
    const recentStubs = await dbGet(
      `pay_stubs?payroll_run_id=not.is.null&select=employee_id,ytd_gross,ytd_net,ytd_tax_withheld,pay_date&order=pay_date.desc`,
    );
    const ytdMap: Record<string, { gross: number; net: number; tax: number }> = {};
    if (Array.isArray(recentStubs)) {
      for (const s of recentStubs) {
        if (!ytdMap[s.employee_id]) {
          ytdMap[s.employee_id] = {
            gross: Number(s.ytd_gross)         || 0,
            net:   Number(s.ytd_net)           || 0,
            tax:   Number(s.ytd_tax_withheld)  || 0,
          };
        }
      }
    }

    // ── 5. Calculate pay for each employee ────────────────────────────────────
    const stubPayloads: unknown[] = [];
    let totalGross = 0;
    let totalNet   = 0;
    let totalTax   = 0;
    const missingBands: string[] = [];

    for (const emp of employees) {
      const annualSalary = bandMap[emp.role_title];
      if (!annualSalary) missingBands.push(`${emp.full_name} (${emp.role_title})`);

      const salary      = annualSalary ?? 100000;
      const grossPay    = round2(salary / periods);

      const ytdBefore   = ytdMap[emp.id] ?? { gross: 0, net: 0, tax: 0 };
      const w4          = w4Map[emp.id]  ?? {
        filing:           "single" as FilingStatus,
        multipleJobs:     false,
        dependentsCredit: 0,
        otherIncome:      0,
        deductions:       0,
        extraWithholding: 0,
      };

      const federalTax  = computeFederalTax({
        grossPerPeriod:   grossPay,
        periods,
        ...w4,
      });

      // State tax: GA flat 5.49% (2024 rate)
      const stateTax = round2(grossPay * 0.0549);

      const { socialSecurity, medicare } = computeFICA(grossPay, ytdBefore.gross, w4.filing);

      const totalWithheld = round2(federalTax + stateTax + socialSecurity + medicare);
      const netPay        = round2(grossPay - totalWithheld);

      const ytdGross = round2(ytdBefore.gross + grossPay);
      const ytdNet   = round2(ytdBefore.net   + netPay);
      const ytdTax   = round2(ytdBefore.tax   + totalWithheld);

      totalGross += grossPay;
      totalNet   += netPay;
      totalTax   += totalWithheld;

      stubPayloads.push({
        employee_id:       emp.id,
        gross_pay:         grossPay,
        federal_tax:       federalTax,
        state_tax:         stateTax,
        social_security:   socialSecurity,
        medicare,
        other_deductions:  0,
        net_pay:           netPay,
        ytd_gross:         ytdGross,
        ytd_net:           ytdNet,
        ytd_tax_withheld:  ytdTax,
        pay_period_start,
        pay_period_end,
        pay_date,
        status:            "draft",
      });
    }

    totalGross = round2(totalGross);
    totalNet   = round2(totalNet);
    totalTax   = round2(totalTax);

    // ── 6. Insert payroll_run ─────────────────────────────────────────────────
    const runResult = await dbPost("payroll_runs", {
      organization_id:    ORG_ID,
      pay_period_start,
      pay_period_end,
      pay_date,
      status:             "draft",
      total_gross:        totalGross,
      total_net:          totalNet,
      total_tax_withheld: totalTax,
      employee_count:     employees.length,
    });

    if (!runResult.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to create payroll_run", details: runResult.data }),
        { status: 500, headers: JSON_HEADERS },
      );
    }

    const payrollRun = Array.isArray(runResult.data) ? runResult.data[0] : runResult.data;
    const runId = payrollRun?.id;

    if (!runId) {
      return new Response(
        JSON.stringify({ error: "payroll_run created but id not returned", raw: payrollRun }),
        { status: 500, headers: JSON_HEADERS },
      );
    }

    // ── 7. Insert pay_stubs (tagged with run id) ──────────────────────────────
    const stubbedPayloads = (stubPayloads as Record<string, unknown>[]).map(s => ({
      ...s,
      payroll_run_id: runId,
    }));

    const stubResult = await dbPost("pay_stubs", stubbedPayloads);

    if (!stubResult.ok) {
      return new Response(
        JSON.stringify({ error: "payroll_run created but pay_stubs insert failed", run_id: runId, details: stubResult.data }),
        { status: 500, headers: JSON_HEADERS },
      );
    }

    return new Response(
      JSON.stringify({
        success:        true,
        payroll_run:    payrollRun,
        summary: {
          employee_count: employees.length,
          pay_period:     `${pay_period_start} → ${pay_period_end}`,
          pay_date,
          total_gross:    totalGross,
          total_net:      totalNet,
          total_tax:      totalTax,
          periods_per_year: periods,
        },
        warnings: missingBands.length > 0
          ? [`No compensation band found for: ${missingBands.join(", ")}. Defaulted to $100,000 annual salary.`]
          : [],
      }),
      { headers: JSON_HEADERS },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message, stack: (err as Error).stack }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
});
