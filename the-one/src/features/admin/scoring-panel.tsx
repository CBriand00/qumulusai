"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { compatibilityCategories, computeOverallScore } from "@/config/compatibility";
import { COMPATIBILITY_DISCLAIMER } from "@/config/compatibility";
import { saveCategoryScore } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ScoreRow { key: string; score: number | null; override: number | null; notes: string | null }

export function ScoringPanel({ applicantId, initial }: { applicantId: string; initial: ScoreRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const initialMap = new Map(initial.map((s) => [s.key, s]));

  const [rows, setRows] = useState(
    compatibilityCategories.map((c) => {
      const ex = initialMap.get(c.key);
      return { key: c.key, score: ex?.score ?? null, override: ex?.override ?? null, notes: ex?.notes ?? "" };
    }),
  );

  const overall = computeOverallScore(rows.map((r) => ({ key: r.key, score: r.score, override: r.override })));

  function update(key: string, patch: Partial<(typeof rows)[number]>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function save(key: string) {
    const row = rows.find((r) => r.key === key)!;
    start(async () => {
      await saveCategoryScore({
        applicantId,
        categoryKey: key,
        score: row.score,
        override: row.override,
        notes: row.notes ?? undefined,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md bg-secondary px-4 py-3">
        <span className="text-sm font-medium">Overall compatibility (admin-only)</span>
        <span className="font-serif text-2xl text-gold">{overall ?? "—"}</span>
      </div>
      <p className="text-xs text-muted-foreground">{COMPATIBILITY_DISCLAIMER}</p>

      <div className="space-y-3">
        {compatibilityCategories.map((c) => {
          const row = rows.find((r) => r.key === c.key)!;
          return (
            <div key={c.key} className="grid items-center gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_90px_90px_auto]">
              <div>
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">Weight {c.weight}</p>
              </div>
              <Input type="number" min={0} max={100} value={row.score ?? ""} placeholder="Score"
                onChange={(e) => update(c.key, { score: e.target.value === "" ? null : Number(e.target.value) })} className="h-9" aria-label={`${c.label} score`} />
              <Input type="number" min={0} max={100} value={row.override ?? ""} placeholder="Override"
                onChange={(e) => update(c.key, { override: e.target.value === "" ? null : Number(e.target.value) })} className="h-9" aria-label={`${c.label} override`} />
              <Button size="sm" variant="outline" disabled={pending} onClick={() => save(c.key)}>Save</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
