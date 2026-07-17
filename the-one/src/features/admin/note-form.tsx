"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNote } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function NoteForm({ applicantId }: { applicantId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a private note (admin-only)…" />
      <Button size="sm" variant="outline" disabled={pending || !body.trim()}
        onClick={() =>
          start(async () => {
            const res = await addNote(applicantId, body);
            if (res.ok) { setBody(""); router.refresh(); }
          })
        }>
        {pending ? "Saving…" : "Add note"}
      </Button>
    </div>
  );
}
