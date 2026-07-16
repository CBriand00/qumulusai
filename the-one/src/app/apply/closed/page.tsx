import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";

export default function ApplicationsClosedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6 text-center text-paper">
      <div className="max-w-lg">
        <p className="eyebrow mb-4 text-gold">{siteConfig.name}</p>
        <h1 className="text-3xl md:text-4xl">Applications are closed</h1>
        <p className="mt-4 text-paper/70">{siteConfig.applicationsClosedMessage}</p>
        <Button asChild variant="outline" className="mt-8 border-paper/30 text-paper hover:bg-paper/10 hover:text-paper">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </div>
  );
}
