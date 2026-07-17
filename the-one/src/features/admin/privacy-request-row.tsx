"use client";

import { useRouter } from "next/navigation";
import { processDeletionRequest, rejectDeletionRequest, markExportDelivered } from "@/features/admin/privacy-actions";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function DeletionRow({ requestId, userId, name, status }: { requestId: string; userId: string; name: string; status: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs capitalize text-muted-foreground">{status}</p>
      </div>
      {status === "requested" ? (
        <div className="flex gap-2">
          <ConfirmButton
            label="Process deletion"
            title="Permanently delete this account?"
            description="This permanently deletes the account and all associated data. This cannot be undone."
            confirmLabel="Delete permanently"
            onConfirm={() => processDeletionRequest(requestId, userId)}
            onDone={() => router.refresh()}
          />
          <Button size="sm" variant="ghost" onClick={async () => { await rejectDeletionRequest(requestId, userId); router.refresh(); }}>
            Reject
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ExportRow({ requestId, name, status }: { requestId: string; name: string; status: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs capitalize text-muted-foreground">{status}</p>
      </div>
      {status !== "delivered" ? (
        <Button size="sm" variant="outline" onClick={async () => { await markExportDelivered(requestId); router.refresh(); }}>
          Mark delivered
        </Button>
      ) : null}
    </div>
  );
}
