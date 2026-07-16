import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { aboutContent } from "@/config/content";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="A woman worth being intentional about"
        intro={aboutContent.intro}
      />
      <section className="bg-paper">
        <div className="container-editorial grid gap-12 py-20 md:grid-cols-[240px_1fr] md:py-28">
          <aside className="hidden md:block">
            <p className="eyebrow mb-4">Contents</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {aboutContent.sections.map((s) => (
                <li key={s.title}>{s.title}</li>
              ))}
            </ul>
          </aside>
          <div className="max-w-2xl space-y-12">
            {aboutContent.sections.map((section) => (
              <article key={section.title}>
                <h2 className="text-2xl md:text-3xl">{section.title}</h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  {section.body}
                </p>
              </article>
            ))}
            <p className="rounded-lg border border-dashed border-border bg-cream p-5 text-sm text-muted-foreground">
              This copy is editable placeholder content, separated from
              application logic. It can be replaced without touching code.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
