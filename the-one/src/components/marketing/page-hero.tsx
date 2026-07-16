interface PageHeroProps {
  eyebrow?: string;
  title: string;
  intro?: string;
}

/** Consistent editorial page header for interior marketing pages. */
export function PageHero({ eyebrow, title, intro }: PageHeroProps) {
  return (
    <section className="border-b border-border bg-cream">
      <div className="container-editorial py-20 md:py-28">
        {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
        <h1 className="max-w-3xl text-4xl leading-[1.1] md:text-6xl">{title}</h1>
        {intro ? (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {intro}
          </p>
        ) : null}
      </div>
    </section>
  );
}
