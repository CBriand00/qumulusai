"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toggleFavorite } from "@/features/admin/actions";
import { cn } from "@/lib/utils";

export function FavoriteButton({ applicantId, isFavorite }: { applicantId: string; isFavorite: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await toggleFavorite(applicantId);
          router.refresh();
        })
      }
      className="rounded p-1 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Star className={cn("h-4 w-4", isFavorite ? "fill-gold text-gold" : "text-muted-foreground")} />
    </button>
  );
}
