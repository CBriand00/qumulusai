"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDateInvitation } from "@/features/dates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DateInviteForm({ applicantId }: { applicantId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"virtual" | "in_person">("virtual");
  const [proposedAt, setProposedAt] = useState("");
  const [location, setLocation] = useState("");
  const [instructions, setInstructions] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function submit() {
    setNotice(null);
    start(async () => {
      const res = await createDateInvitation(applicantId, {
        mode,
        proposedAt: proposedAt ? new Date(proposedAt).toISOString() : "",
        locationLabel: location,
        instructions,
        responseDeadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
      setNotice(res.ok ? "Invitation sent." : res.message ?? "Failed.");
      if (res.ok) { setProposedAt(""); setLocation(""); setInstructions(""); setDeadline(""); router.refresh(); }
    });
  }

  return (
    <div className="space-y-3">
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      <div className="space-y-2">
        <Label htmlFor="date-mode">Mode</Label>
        <select id="date-mode" value={mode} onChange={(e) => setMode(e.target.value as "virtual" | "in_person")} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
          <option value="virtual">Virtual</option>
          <option value="in_person">In person</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="date-when">Proposed date &amp; time</Label>
        <Input id="date-when" type="datetime-local" value={proposedAt} onChange={(e) => setProposedAt(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="date-loc">Location (public place — never a home address)</Label>
        <Input id="date-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Video call, or a well-known café" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="date-inst">Private instructions</Label>
        <Textarea id="date-inst" value={instructions} onChange={(e) => setInstructions(e.target.value)} className="min-h-[60px]" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="date-deadline">Response deadline (optional)</Label>
        <Input id="date-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <Button variant="gold" size="sm" onClick={submit} disabled={pending}>Send invitation</Button>
    </div>
  );
}
