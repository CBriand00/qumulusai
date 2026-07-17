import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { safetyPoints } from "@/config/content";

export const metadata: Metadata = { title: "Safety & Privacy" };

export default function SafetyPage() {
  return (
    <>
      <PageHero
        eyebrow="Safety & Privacy"
        title="Your privacy is the foundation"
        intro="This platform is built privacy-first. Here is exactly how your information is protected."
      />
      <section className="bg-paper">
        <div className="container-editorial py-20 md:py-28">
          <ul className="mx-auto max-w-3xl space-y-5">
            {safetyPoints.map((point) => (
              <li key={point} className="flex gap-4 border-b border-border pb-5">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                <span className="text-lg leading-relaxed text-muted-foreground">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
