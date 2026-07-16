import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqItems } from "@/config/content";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Questions, answered"
        intro="Everything you might want to know before you apply."
      />
      <section className="bg-paper">
        <div className="container-editorial py-20 md:py-28">
          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible>
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </>
  );
}
