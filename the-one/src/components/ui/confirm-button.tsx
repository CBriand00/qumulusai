"use client";

import { useState, useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ConfirmButtonProps {
  label: string;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: ButtonProps["variant"];
  onConfirm: () => Promise<{ ok: boolean; message?: string } | void>;
  onDone?: () => void;
}

/** A button that opens a confirmation modal before running a destructive action. */
export function ConfirmButton({
  label,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "destructive",
  onConfirm,
  onDone,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await onConfirm();
      if (res && "ok" in res && !res.ok) {
        setError(res.message ?? "Something went wrong.");
        return;
      }
      setOpen(false);
      onDone?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">{label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Cancel</Button>
          </DialogClose>
          <Button variant={variant} size="sm" onClick={run} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
