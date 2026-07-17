import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { Button } from "@/components/ui/button";
import { howItWorksSteps, howItWorksDisclaimer } from "@/config/content";

export const metadata: Metadata = { title: "How It Works" };

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How It Works"
        title="A private, considered process"
        intro="Every step is intentional. Take your time — your progress is always saved."
      />
      <section className="bg-paper">
        <div className="container-editorial py-20 md:py-28">
          <ol className="mx-auto max-w-3xl space-y-10">
            {howItWorksSteps.map((step, i) => (
              <li key={step.title} className="flex gap-6">
                <span className="font-serif text-4xl leading-none text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="border-b border-border pb-8">
                  <h2 className="text-2xl">{step.title}</h2>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mx-auto mt-12 flex max-w-3xl gap-3 rounded-lg border border-border bg-cream p-5">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
            <p className="text-sm text-muted-foreground">{howItWorksDisclaimer}</p>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <Button asChild variant="gold" size="lg">
              <Link href="/apply">Begin Your Application</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
