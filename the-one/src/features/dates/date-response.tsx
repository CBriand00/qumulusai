"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToDate } from "@/features/dates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DateResponse({ dateId }: { dateId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function respond(response: "accepted" | "declined" | "counter_proposed") {
    start(async () => {
      await respondToDate(dateId, response, note);
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a brief note (optional)" className="h-9" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="gold" disabled={pending} onClick={() => respond("accepted")}>Accept</Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => respond("counter_proposed")}>Suggest another time</Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => respond("declined")}>Decline</Button>
      </div>
    </div>
  );
}
