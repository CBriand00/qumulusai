import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, BadgeCheck } from "lucide-react";
import { getApplicantDetail } from "@/features/admin/queries";
import { applicationSteps } from "@/config/application-schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/status-badge";
import { FavoriteButton } from "@/features/admin/favorite-button";
import { StatusControl } from "@/features/admin/status-control";
import { NoteForm } from "@/features/admin/note-form";
import { ScoringPanel } from "@/features/admin/scoring-panel";
import { FlagControl } from "@/features/admin/flag-control";

export const metadata: Metadata = { title: "Applicant" };
export const dynamic = "force-dynamic";

export default async function ApplicantDetailPage({ params }: { params: { id: string } }) {
  const detail = await getApplicantDetail(params.id);
  if (!detail) notFound();

  const profile = detail.profile ?? {};
  const photos = detail.media.filter((m) => m.kind !== "video_intro");
  const video = detail.media.find((m) => m.kind === "video_intro");

  const valueFor = (field: { key: string; profileColumn?: string }) => {
    const raw = field.profileColumn ? profile[field.profileColumn] : detail.answers[field.key];
    if (raw === null || raw === undefined || raw === "") return "—";
    if (typeof raw === "boolean") return raw ? "Yes" : "No";
    return String(raw);
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/applicants" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> All applicants
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {photos[0]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0].url} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-xl">{detail.name.slice(0, 1)}</span>
          )}
          <div>
            <h1 className="font-serif text-3xl">{detail.name}</h1>
            <div className="mt-1 flex items-center gap-3">
              <StatusBadge status={detail.status} />
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <BadgeCheck className="h-3.5 w-3.5" /> {detail.verification}
              </span>
            </div>
          </div>
        </div>
        <FavoriteButton applicantId={detail.applicantId} isFavorite={detail.isFavorite} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main column */}
        <div className="space-y-6">
          {/* Media */}
          <Card>
            <CardHeader><CardTitle>Media</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {photos.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {photos.map((m) => m.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={m.id} src={m.url} alt={m.kind} className="h-32 w-32 rounded-md object-cover" />
                  ) : null)}
                </div>
              ) : <p className="text-sm text-muted-foreground">No photos uploaded.</p>}
              {video?.url ? (
                <video src={video.url} controls className="w-full max-w-md rounded-md" />
              ) : <p className="text-sm text-muted-foreground">No video introduction.</p>}
            </CardContent>
          </Card>

          {/* Full application */}
          {applicationSteps.filter((s) => !s.special).map((step) => (
            <Card key={step.key}>
              <CardHeader><CardTitle>{step.title}</CardTitle></CardHeader>
              <CardContent>
                <dl className="divide-y divide-border">
                  {step.fields.map((field) => (
                    <div key={field.key} className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-3">
                      <dt className="text-sm text-muted-foreground">{field.label}</dt>
                      <dd className="text-sm sm:col-span-2">{valueFor(field)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ))}

          {/* Compatibility scoring */}
          <Card>
            <CardHeader><CardTitle>Compatibility (decision-support only)</CardTitle></CardHeader>
            <CardContent>
              <ScoringPanel applicantId={detail.applicantId} initial={detail.scores} />
            </CardContent>
          </Card>

          {/* AI analysis (generated in Phase 5) */}
          <Card>
            <CardHeader><CardTitle>AI analysis</CardTitle></CardHeader>
            <CardContent>
              {detail.aiAnalysis.length > 0 ? (
                <ul className="space-y-3">
                  {detail.aiAnalysis.map((a) => (
                    <li key={a.id} className="rounded-md border border-border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{a.kind}</p>
                      <pre className="mt-1 whitespace-pre-wrap text-sm">{JSON.stringify(a.content, null, 2)}</pre>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No AI summaries yet. AI-generated summaries, strengths, concerns,
                  contradictions, and suggested follow-ups are produced in Phase 5.
                  AI output is decision-support only.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Activity timeline */}
          <Card>
            <CardHeader><CardTitle>Activity timeline</CardTitle></CardHeader>
            <CardContent>
              {detail.statusHistory.length > 0 ? (
                <ul className="space-y-3">
                  {detail.statusHistory.map((h, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                      <span>{h.from_status ? `${h.from_status} → ` : ""}<strong>{h.to_status}</strong>{h.reason ? ` — ${h.reason}` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No history yet.</p>}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Status &amp; actions</CardTitle></CardHeader>
            <CardContent><StatusControl applicantId={detail.applicantId} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Flags</CardTitle></CardHeader>
            <CardContent><FlagControl applicantId={detail.applicantId} flags={detail.flags} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Private notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <NoteForm applicantId={detail.applicantId} />
              {detail.notes.length > 0 ? (
                <ul className="space-y-3">
                  {detail.notes.map((n) => (
                    <li key={n.id} className="rounded-md bg-secondary p-3 text-sm">
                      <p>{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No notes yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
