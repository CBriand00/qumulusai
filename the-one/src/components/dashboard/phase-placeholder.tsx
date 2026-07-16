import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Consistent, honest placeholder for surfaces delivered in a later phase. */
export function PhasePlaceholder({
  eyebrow,
  title,
  phase,
  children,
}: {
  eyebrow: string;
  title: string;
  phase: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1 text-3xl">{title}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>{phase}</CardTitle></CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
