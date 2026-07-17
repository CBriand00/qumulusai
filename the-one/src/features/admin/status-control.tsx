"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setApplicantStatus,
  setMessaging,
  requestInformation,
  deleteApplicant,
} from "@/features/admin/actions";
import type { ApplicantStatus } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton } from "@/components/ui/confirm-button";

const POSITIVE: { status: ApplicantStatus; label: string }[] = [
  { status: "under_review", label: "Mark under review" },
  { status: "shortlisted", label: "Shortlist" },
  { status: "approved_to_connect", label: "Approve to connect" },
  { status: "date_invited", label: "Mark date invited" },
  { status: "dating", label: "Mark connected" },
  { status: "paused", label: "Pause" },
];

export function StatusControl({ applicantId }: { applicantId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [infoMsg, setInfoMsg] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      const res = await fn();
      setNotice(res.ok ? "Updated." : res.message ?? "Failed.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

      <div className="flex flex-wrap gap-2">
        {POSITIVE.map((p) => (
          <Button key={p.status} size="sm" variant="outline" disabled={pending}
            onClick={() => run(() => setApplicantStatus(applicantId, p.status))}>
            {p.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="gold" disabled={pending}
          onClick={() => run(() => setMessaging(applicantId, true))}>
          Unlock messaging
        </Button>
        <Button size="sm" variant="ghost" disabled={pending}
          onClick={() => run(() => setMessaging(applicantId, false))}>
          Close messaging
        </Button>
      </div>

      {/* Request additional information */}
      <div className="space-y-2 rounded-md border border-border p-3">
        <p className="text-sm font-medium">Request additional information</p>
        <Textarea value={infoMsg} onChange={(e) => setInfoMsg(e.target.value)} placeholder="What would you like the applicant to provide?" className="min-h-[70px]" />
        <Button size="sm" variant="outline" disabled={pending}
          onClick={() => run(async () => { const r = await requestInformation(applicantId, infoMsg); setInfoMsg(""); return r; })}>
          Send request
        </Button>
      </div>

      {/* Destructive actions with confirmation */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <ConfirmButton label="Not selected" variant="outline"
          title="Mark as not selected?" description="The applicant will see respectful, limited language."
          confirmLabel="Confirm" onConfirm={() => setApplicantStatus(applicantId, "not_selected")} onDone={() => router.refresh()} />
        <ConfirmButton label="Archive" variant="outline"
          title="Archive this applicant?" description="Archived applicants are hidden from active review."
          confirmLabel="Archive" onConfirm={() => setApplicantStatus(applicantId, "archived")} onDone={() => router.refresh()} />
        <ConfirmButton label="Block" variant="destructive"
          title="Block this applicant?" description="Blocking closes the account's access to the platform."
          confirmLabel="Block" onConfirm={() => setApplicantStatus(applicantId, "blocked")} onDone={() => router.refresh()} />
        <ConfirmButton label="Delete" variant="destructive"
          title="Permanently delete this applicant?" description="This permanently deletes the account and all associated data. This cannot be undone."
          confirmLabel="Delete permanently"
          onConfirm={() => deleteApplicant(applicantId)}
          onDone={() => router.push("/admin/applicants")} />
      </div>
    </div>
  );
}
