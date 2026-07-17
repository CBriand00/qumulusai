import { APPLICANT_STATUS_LABELS, type ApplicantStatus } from "@/config/site";
import { cn } from "@/lib/utils";

const TONE: Record<ApplicantStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-secondary text-secondary-foreground",
  under_review: "bg-secondary text-secondary-foreground",
  additional_info_requested: "bg-gold/20 text-espresso",
  shortlisted: "bg-gold/30 text-espresso",
  approved_to_connect: "bg-gold text-ink",
  messaging_open: "bg-gold text-ink",
  date_invited: "bg-gold text-ink",
  dating: "bg-gold text-ink",
  paused: "bg-muted text-muted-foreground",
  not_selected: "bg-muted text-muted-foreground",
  withdrawn: "bg-muted text-muted-foreground",
  blocked: "bg-destructive/15 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: ApplicantStatus }) {
  return (
    <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", TONE[status])}>
      {APPLICANT_STATUS_LABELS[status]}
    </span>
  );
}
