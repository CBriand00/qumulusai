"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { withdrawApplication } from "@/features/application/actions";
import { requestAccountDeletion } from "@/features/account/actions";

export function AccountControls({ canWithdraw }: { canWithdraw: boolean }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {notice ? (
        <p className="rounded-md bg-secondary px-4 py-3 text-sm text-secondary-foreground">{notice}</p>
      ) : null}

      <div className="flex flex-col gap-2 border-b border-border pb-6">
        <p className="font-medium">Download your data</p>
        <p className="text-sm text-muted-foreground">
          Download a copy of everything you&apos;ve submitted, as JSON.
        </p>
        <div>
          <Button asChild variant="outline" size="sm">
            <a href="/api/export" download>
              <Download className="h-4 w-4" /> Download my data
            </a>
          </Button>
        </div>
      </div>

      {canWithdraw ? (
        <div className="flex flex-col gap-2 border-b border-border pb-6">
          <p className="font-medium">Withdraw your application</p>
          <p className="text-sm text-muted-foreground">
            You can withdraw at any time. You may reapply later.
          </p>
          <div>
            <ConfirmButton
              label="Withdraw application"
              variant="outline"
              title="Withdraw your application?"
              description="Your application will be marked as withdrawn. This can be discussed with you if reconsidered."
              confirmLabel="Withdraw"
              onConfirm={async () => withdrawApplication()}
              onDone={() => { setNotice("Your application has been withdrawn."); router.refresh(); }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="font-medium">Delete your account</p>
        <p className="text-sm text-muted-foreground">
          Request permanent deletion of your account and data, subject to legal
          retention requirements.
        </p>
        <div>
          <ConfirmButton
            label="Delete my account"
            title="Delete your account and data?"
            description="This requests permanent deletion of your account and submitted information. Certain records may be retained where legally required."
            confirmLabel="Request deletion"
            onConfirm={async () => requestAccountDeletion()}
            onDone={() => setNotice("Your deletion request has been received.")}
          />
        </div>
      </div>
    </div>
  );
}
