"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw } from "lucide-react";
import { generateAnalysis } from "@/features/admin/ai-actions";
import { aiPrompts, aiKinds } from "@/config/ai-prompts";
import type { AnalysisKind } from "@/lib/ai/provider";
import { Button } from "@/components/ui/button";

interface AiItem { id: string; kind: string; content: unknown; model: string | null; created_at: string }

function renderContent(content: unknown) {
  const c = content as { text?: string; items?: string[] } | null;
  if (!c) return null;
  return (
    <>
      {c.text ? <p className="text-sm">{c.text}</p> : null}
      {c.items && c.items.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {c.items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      ) : null}
    </>
  );
}

export function AiPanel({ applicantId, analyses }: { applicantId: string; analyses: AiItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyKind, setBusyKind] = useState<string | null>(null);

  // Latest analysis per kind + version count.
  const latest = new Map<string, AiItem>();
  const counts = new Map<string, number>();
  for (const a of analyses) {
    counts.set(a.kind, (counts.get(a.kind) ?? 0) + 1);
    if (!latest.has(a.kind)) latest.set(a.kind, a);
  }

  function run(kind: AnalysisKind) {
    setBusyKind(kind);
    start(async () => {
      await generateAnalysis(applicantId, kind);
      setBusyKind(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
        AI output is decision-support only. It does not decide, does not infer
        protected characteristics, and does not detect deception. You make all decisions.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {aiKinds.map((kind) => {
          const def = aiPrompts[kind];
          const item = latest.get(kind);
          const count = counts.get(kind) ?? 0;
          return (
            <div key={kind} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{def.label}</p>
                <Button size="sm" variant="ghost" disabled={pending}
                  onClick={() => run(kind)} aria-label={`Generate ${def.label}`}>
                  {busyKind === kind ? <RefreshCw className="h-4 w-4 animate-spin" /> : item ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </div>
              {item ? (
                <div className="mt-2">
                  {renderContent(item.content)}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {item.model} · {new Date(item.created_at).toLocaleString()}{count > 1 ? ` · ${count} versions` : ""}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Not generated yet.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
