import type { Metadata } from "next";
import { Check, X, Star } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { lookingForContent } from "@/config/content";

export const metadata: Metadata = { title: "What I'm Looking For" };

export default function LookingForPage() {
  return (
    <>
      <PageHero
        eyebrow="What I'm Looking For"
        title="Clarity is a kindness"
        intro={lookingForContent.intro}
      />
      <section className="bg-paper">
        <div className="container-editorial py-20 md:py-28">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {lookingForContent.categories.map((cat) => (
              <div key={cat.title} className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-xl">{cat.title}</h2>
                <ul className="mt-4 space-y-2">
                  {cat.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-cream p-6">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-gold" />
                <h3 className="text-lg">Preferences</h3>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {lookingForContent.preferences.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-gold" />
                <h3 className="text-lg">Non-Negotiables</h3>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {lookingForContent.nonNegotiables.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <X className="h-5 w-5 text-burgundy" />
                <h3 className="text-lg">Deal Breakers</h3>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {lookingForContent.dealBreakers.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
