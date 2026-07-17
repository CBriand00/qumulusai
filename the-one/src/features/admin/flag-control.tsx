"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { addFlag, removeFlag } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Flag { id: string; flag: string; label: string | null }

export function FlagControl({ applicantId, flags }: { applicantId: string; flags: Flag[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<"green" | "concern">("green");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      {flags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {flags.map((f) => (
            <li key={f.id} className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs",
              f.flag === "green" ? "bg-gold/20 text-espresso" : "bg-muted text-muted-foreground")}>
              <span>{f.flag === "green" ? "▲" : "●"} {f.label ?? f.flag}</span>
              <button type="button" aria-label="Remove flag"
                onClick={() => start(async () => { await removeFlag(f.id, applicantId); router.refresh(); })}>
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">No flags yet.</p>}

      <div className="flex gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as "green" | "concern")} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="green">Green flag</option>
          <option value="concern">Concern</option>
        </select>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="h-9" />
        <Button size="sm" variant="outline" disabled={pending}
          onClick={() => start(async () => { await addFlag(applicantId, kind, label || undefined); setLabel(""); router.refresh(); })}>
          Add
        </Button>
      </div>
    </div>
  );
}
