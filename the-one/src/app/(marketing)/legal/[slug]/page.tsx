import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { legalDocs, legalSlugs, LEGAL_REVIEW_NOTICE } from "@/config/legal";

export function generateStaticParams() {
  return legalSlugs.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const doc = legalDocs[params.slug];
  return { title: doc?.title ?? "Legal" };
}

export default function LegalPage({ params }: { params: { slug: string } }) {
  const doc = legalDocs[params.slug];
  if (!doc) notFound();

  return (
    <>
      <PageHero eyebrow="Legal" title={doc.title} />
      <section className="bg-paper">
        <div className="container-editorial py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 flex gap-3 rounded-lg border border-burgundy/30 bg-burgundy/5 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-burgundy" />
              <p className="text-sm text-muted-foreground">{LEGAL_REVIEW_NOTICE}</p>
            </div>
            <div className="space-y-5">
              {doc.body.map((para, i) => (
                <p key={i} className="leading-relaxed text-muted-foreground">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
