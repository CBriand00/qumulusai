"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDateInvitation } from "@/features/dates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminDateControls({ dateId }: { dateId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reschedule, setReschedule] = useState("");
  const [notes, setNotes] = useState("");

  function run(patch: Parameters<typeof updateDateInvitation>[1]) {
    start(async () => {
      await updateDateInvitation(dateId, patch);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input type="datetime-local" value={reschedule} onChange={(e) => setReschedule(e.target.value)} className="h-9 w-auto" aria-label="Reschedule" />
        <Button size="sm" variant="outline" disabled={pending || !reschedule}
          onClick={() => run({ proposedAt: new Date(reschedule).toISOString() })}>
          Reschedule
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run({ status: "completed" })}>Mark completed</Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run({ status: "cancelled" })}>Cancel</Button>
      </div>
      <div className="flex items-center gap-2">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private post-date notes" className="h-9" />
        <Button size="sm" variant="outline" disabled={pending || !notes} onClick={() => run({ adminPostNotes: notes })}>Save notes</Button>
      </div>
    </div>
  );
}
