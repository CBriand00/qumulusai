"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSiteContent, setApplicationsOpen } from "@/features/admin/content-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  initial: { heroHeadline: string; heroSubhead: string; tagline: string; applicationsOpen: boolean };
}

export function ContentEditor({ initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [heroHeadline, setHeadline] = useState(initial.heroHeadline);
  const [heroSubhead, setSubhead] = useState(initial.heroSubhead);
  const [tagline, setTagline] = useState(initial.tagline);
  const [open, setOpen] = useState(initial.applicationsOpen);
  const [notice, setNotice] = useState<string | null>(null);

  function saveCopy() {
    setNotice(null);
    start(async () => {
      const res = await saveSiteContent({ heroHeadline, heroSubhead, tagline });
      setNotice(res.ok ? "Saved." : res.message ?? "Failed.");
      router.refresh();
    });
  }

  function toggleOpen(next: boolean) {
    setOpen(next);
    start(async () => {
      await setApplicationsOpen(next);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

      <div className="flex items-center justify-between rounded-md border border-border p-4">
        <div>
          <p className="font-medium">Applications open</p>
          <p className="text-sm text-muted-foreground">Controls whether visitors can start an application.</p>
        </div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={open} disabled={pending} onChange={(e) => toggleOpen(e.target.checked)} className="h-5 w-5" />
          <span className="text-sm">{open ? "Open" : "Closed"}</span>
        </label>
      </div>

      <div className="space-y-4 rounded-md border border-border p-4">
        <p className="font-medium">Landing hero</p>
        <div className="space-y-2">
          <Label htmlFor="hh">Headline</Label>
          <Input id="hh" value={heroHeadline} onChange={(e) => setHeadline(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hs">Subhead</Label>
          <Input id="hs" value={heroSubhead} onChange={(e) => setSubhead(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tg">Tagline</Label>
          <Input id="tg" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>
        <Button variant="gold" size="sm" onClick={saveCopy} disabled={pending}>Save copy</Button>
      </div>
    </div>
  );
}
