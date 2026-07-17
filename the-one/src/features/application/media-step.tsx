"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Image as ImageIcon, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { platformRules } from "@/config/site";
import { recordMedia, deleteMedia } from "@/features/application/actions";
import { Button } from "@/components/ui/button";

type MediaItem = { id: string; kind: string; storage_path: string; url: string | null };

const PHOTO_KINDS = new Set(["primary_photo", "photo", "professional_photo", "full_length_photo"]);

const uploadSlots: { kind: string; label: string; help: string }[] = [
  { kind: "primary_photo", label: "Primary profile photo", help: "Required. Recent, clear, just you." },
  { kind: "photo", label: "Additional photos", help: `At least ${platformRules.media.minAdditionalPhotos} recent photos.` },
  { kind: "professional_photo", label: "Professional photo (optional)", help: "Optional." },
  { kind: "full_length_photo", label: "Full-length photo (optional)", help: "Optional." },
  { kind: "video_intro", label: "Video introduction", help: `Required. Up to ${platformRules.media.maxVideoDurationSeconds / 60} minutes.` },
];

export function MediaStep({ media, disabled }: { media: MediaItem[]; disabled?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const supabase = createClient();

  async function handleFile(kind: string, file: File) {
    setError(null);
    const isVideo = kind === "video_intro";
    const allowed: readonly string[] = isVideo
      ? platformRules.media.allowedVideoTypes
      : platformRules.media.allowedImageTypes;
    const maxMB = isVideo ? platformRules.media.maxVideoSizeMB : platformRules.media.maxPhotoSizeMB;

    if (!allowed.includes(file.type)) {
      setError(`Unsupported file type. Allowed: ${allowed.join(", ")}.`);
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setError(`File is too large (max ${maxMB} MB).`);
      return;
    }

    let durationSeconds: number | undefined;
    if (isVideo) {
      durationSeconds = await readVideoDuration(file).catch(() => undefined);
      if (durationSeconds && durationSeconds > platformRules.media.maxVideoDurationSeconds) {
        setError(`Video must be ${platformRules.media.maxVideoDurationSeconds / 60} minutes or less.`);
        return;
      }
    }

    setBusy(kind);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Not signed in.");

      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${userId}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("applicant-media")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const res = await recordMedia({
        kind,
        storagePath: path,
        mimeType: file.type,
        sizeBytes: file.size,
        durationSeconds,
      });
      if (!res.ok) throw new Error(res.message ?? "Upload failed.");
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id: string) {
    setBusy(id);
    await deleteMedia(id);
    startTransition(() => router.refresh());
    setBusy(null);
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border bg-cream p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Upload guidance</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Photos must be recent, with no filters that materially alter your appearance.</li>
          <li>No group photos as your main image; no other people featured prominently.</li>
          <li>No explicit content, screenshots, or hidden identity.</li>
        </ul>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {uploadSlots.map((slot) => {
        const items = media.filter((m) => m.kind === slot.kind);
        const isVideo = slot.kind === "video_intro";
        return (
          <div key={slot.kind} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{slot.label}</p>
                <p className="text-xs text-muted-foreground">{slot.help}</p>
              </div>
              {!disabled ? (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="sr-only"
                    accept={isVideo ? "video/*" : "image/*"}
                    disabled={busy !== null}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(slot.kind, f);
                      e.target.value = "";
                    }}
                  />
                  <span className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm hover:bg-secondary">
                    <Upload className="h-4 w-4" />
                    {busy === slot.kind ? "Uploading…" : "Upload"}
                  </span>
                </label>
              ) : null}
            </div>

            {items.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {items.map((m) => (
                  <div key={m.id} className="relative">
                    {PHOTO_KINDS.has(m.kind) && m.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt={slot.label} className="h-28 w-28 rounded-md object-cover" />
                    ) : m.url ? (
                      <video src={m.url} className="h-28 w-44 rounded-md object-cover" controls />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-md bg-secondary">
                        {isVideo ? <Video className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                      </div>
                    )}
                    {!disabled ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        aria-label="Remove"
                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video."));
    };
    video.src = url;
  });
}
