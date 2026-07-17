import type { Metadata } from "next";
import Link from "next/link";
import { Video } from "lucide-react";
import { listApplicants, type ApplicantListFilters } from "@/features/admin/queries";
import { APPLICANT_STATUSES, APPLICANT_STATUS_LABELS, type ApplicantStatus } from "@/config/site";
import { StatusBadge } from "@/components/admin/status-badge";
import { FavoriteButton } from "@/features/admin/favorite-button";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Applicants" };
export const dynamic = "force-dynamic";

const SORTS: { value: string; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "recently_active", label: "Recently active" },
  { value: "highest_compatibility", label: "Highest compatibility" },
  { value: "most_complete", label: "Most complete" },
  { value: "favorites", label: "Favorites first" },
];

function parseFilters(sp: Record<string, string | undefined>): ApplicantListFilters {
  return {
    search: sp.search || undefined,
    status: sp.status || undefined,
    faith: sp.faith || undefined,
    children: sp.children === "yes" || sp.children === "no" ? (sp.children as "yes" | "no") : undefined,
    hasVideo: sp.hasVideo === "1",
    favoritesOnly: sp.favoritesOnly === "1",
    minScore: sp.minScore ? Number(sp.minScore) : undefined,
    sort: (sp.sort as ApplicantListFilters["sort"]) || "newest",
  };
}

export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const rows = await listApplicants(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow text-gold">Review</p>
          <h1 className="mt-1 font-serif text-3xl">Applicants</h1>
        </div>
        <p className="text-sm text-muted-foreground">{rows.length} shown</p>
      </div>

      {/* Filters (native GET form — works without JS) */}
      <form className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-6">
        <input name="search" defaultValue={filters.search} placeholder="Search name, city, occupation" className="h-9 rounded-md border border-input bg-background px-3 text-sm md:col-span-2" />
        <select name="status" defaultValue={filters.status ?? ""} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="">All statuses</option>
          {APPLICANT_STATUSES.map((s) => (
            <option key={s} value={s}>{APPLICANT_STATUS_LABELS[s as ApplicantStatus]}</option>
          ))}
        </select>
        <input name="faith" defaultValue={filters.faith} placeholder="Faith" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
        <select name="children" defaultValue={searchParams.children ?? ""} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="">Children: any</option>
          <option value="yes">Has children</option>
          <option value="no">No children</option>
        </select>
        <select name="sort" defaultValue={filters.sort} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hasVideo" value="1" defaultChecked={filters.hasVideo} className="h-4 w-4" /> Has video
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="favoritesOnly" value="1" defaultChecked={filters.favoritesOnly} className="h-4 w-4" /> Favorites
        </label>
        <input name="minScore" type="number" min={0} max={100} defaultValue={filters.minScore} placeholder="Min score" className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" size="sm" variant="gold">Apply</Button>
          <Button asChild type="button" size="sm" variant="ghost"><Link href="/admin/applicants">Reset</Link></Button>
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-3">★</th>
              <th className="px-3 py-3">Applicant</th>
              <th className="px-3 py-3">Age</th>
              <th className="px-3 py-3">City</th>
              <th className="px-3 py-3">Occupation</th>
              <th className="px-3 py-3">Faith</th>
              <th className="px-3 py-3">Children</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Score</th>
              <th className="px-3 py-3">Flags</th>
              <th className="px-3 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.applicantId} className="hover:bg-secondary/40">
                <td className="px-3 py-3"><FavoriteButton applicantId={r.applicantId} isFavorite={r.isFavorite} /></td>
                <td className="px-3 py-3">
                  <Link href={`/admin/applicants/${r.applicantId}`} className="flex items-center gap-3 hover:text-gold">
                    {r.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs">{r.name.slice(0, 1)}</span>
                    )}
                    <span className="flex items-center gap-1 font-medium">
                      {r.name}
                      {r.hasVideo ? <Video className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3">{r.age ?? "—"}</td>
                <td className="px-3 py-3">{r.city ?? "—"}</td>
                <td className="px-3 py-3">{r.occupation ?? "—"}</td>
                <td className="px-3 py-3">{r.faith ?? "—"}</td>
                <td className="px-3 py-3">{r.hasChildren === null ? "—" : r.hasChildren ? "Yes" : "No"}</td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-3 font-medium text-gold">{r.overallScore ?? "—"}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-gold">{r.greenFlags}▲</span>{" "}
                  <span className="text-muted-foreground">{r.concerns}●</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                  {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">No applicants match these filters.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
