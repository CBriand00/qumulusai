import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Eye,
  HeartHandshake,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getSiteOverrides } from "@/lib/site-settings";
import {
  howItWorksSteps,
  valuesContent,
  eligibilityRequirements,
  safetyPoints,
  faqItems,
} from "@/config/content";

// Reads admin-editable hero copy from the CMS (with static fallbacks).
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const overrides = await getSiteOverrides();
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-paper">
        <div className="container-editorial flex min-h-[85vh] flex-col justify-center py-24">
          <p className="eyebrow mb-6 text-gold animate-fade-up">{overrides.tagline}</p>
          <h1 className="max-w-4xl text-5xl leading-[1.05] md:text-7xl animate-fade-up">
            {overrides.heroHeadline}
          </h1>
          <p className="mt-8 max-w-2xl text-xl leading-relaxed text-paper/75 animate-fade-up">
            {overrides.heroSubhead} Every application is for the opportunity to
            build something real with one person — reviewed privately, and with
            intention.
          </p>
          <div className="mt-12 flex flex-col gap-4 sm:flex-row animate-fade-up">
            <Button asChild variant="gold" size="lg">
              <Link href="/apply">Apply for Consideration</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-paper/30 text-paper hover:bg-paper/10 hover:text-paper"
            >
              <Link href="/how-it-works">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Introductory statement */}
      <section className="border-b border-border bg-paper">
        <div className="container-editorial py-24 md:py-32">
          <p className="eyebrow mb-6">An Intentional Path</p>
          <p className="max-w-4xl font-serif text-3xl leading-snug md:text-4xl">
            This is not a place to browse or be browsed. It is a singular,
            private matchmaking experience — considered, discreet, and built for
            those who are genuinely ready.
          </p>
        </div>
      </section>

      {/* How the process works */}
      <section className="bg-cream">
        <div className="container-editorial py-24">
          <p className="eyebrow mb-4">How the Process Works</p>
          <h2 className="max-w-2xl text-3xl md:text-4xl">
            A considered journey, one step at a time
          </h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {howItWorksSteps.slice(0, 6).map((step, i) => (
              <div key={step.title} className="border-t border-border pt-6">
                <span className="font-serif text-3xl text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Button asChild variant="ghost">
              <Link href="/how-it-works">
                See the full process <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* What makes it different */}
      <section className="border-y border-border bg-paper">
        <div className="container-editorial py-24">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="eyebrow mb-4">What Makes This Different</p>
              <h2 className="text-3xl md:text-4xl">
                Not another app. A private invitation.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                There are no endless profiles, no swiping, and no games. There
                is one path, one review, and one intention: to explore whether
                something real and lasting is possible.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                { icon: Eye, title: "Private by design", body: "Profiles are never public. Applicants cannot browse one another." },
                { icon: Lock, title: "Controlled messaging", body: "Conversation only opens after approval." },
                { icon: HeartHandshake, title: "Intentional", body: "Built for serious, relationship-ready adults." },
                { icon: Sparkles, title: "Considered review", body: "Every application is reviewed individually." },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-lg border border-border bg-card p-6">
                  <Icon className="h-6 w-6 text-gold" />
                  <h3 className="mt-4 text-lg">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Relationship intention + values */}
      <section className="bg-espresso text-paper">
        <div className="container-editorial py-24">
          <p className="eyebrow mb-4 text-gold">Relationship Intention</p>
          <h2 className="max-w-3xl text-3xl md:text-4xl">
            This is about readiness, not romance as performance.
          </h2>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {valuesContent.map((v) => (
              <div key={v.title} className="border-t border-paper/20 pt-5">
                <h3 className="text-xl text-paper">{v.title}</h3>
                <p className="mt-2 text-sm text-paper/70">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Minimum eligibility */}
      <section className="bg-paper">
        <div className="container-editorial py-24">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="eyebrow mb-4">Minimum Eligibility</p>
              <h2 className="text-3xl md:text-4xl">Before you begin</h2>
              <p className="mt-6 text-muted-foreground">
                A few honest requirements ensure this experience remains
                meaningful for everyone involved.
              </p>
            </div>
            <ul className="space-y-4">
              {eligibilityRequirements.map((req) => (
                <li key={req} className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                  <span className="text-muted-foreground">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Privacy & safety */}
      <section className="border-y border-border bg-cream">
        <div className="container-editorial py-24">
          <p className="eyebrow mb-4">Privacy &amp; Safety</p>
          <h2 className="max-w-2xl text-3xl md:text-4xl">
            Discretion is the foundation
          </h2>
          <div className="mt-12 grid gap-x-10 gap-y-4 md:grid-cols-2">
            {safetyPoints.slice(0, 6).map((point) => (
              <div key={point} className="flex gap-3 border-b border-border/60 py-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span className="text-sm text-muted-foreground">{point}</span>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Button asChild variant="outline">
              <Link href="/safety">Read our full safety commitment</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-paper">
        <div className="container-editorial py-24">
          <p className="eyebrow mb-4">Frequently Asked Questions</p>
          <h2 className="text-3xl md:text-4xl">Questions, answered</h2>
          <div className="mt-10 max-w-3xl">
            <Accordion type="single" collapsible>
              {faqItems.slice(0, 6).map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div className="mt-10">
            <Button asChild variant="ghost">
              <Link href="/faq">
                See all questions <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-ink text-paper">
        <div className="container-editorial py-28 text-center">
          <h2 className="mx-auto max-w-3xl text-4xl leading-tight md:text-6xl">
            One woman. One intentional path to connection.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-paper/70">
            If you are genuinely ready, you are invited to apply. Every
            application is considered privately.
          </p>
          <div className="mt-10">
            <Button asChild variant="gold" size="lg">
              <Link href="/apply">Apply for Consideration</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
