import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-center">
      <div className="max-w-md">
        <p className="eyebrow mb-4">{siteConfig.name}</p>
        <h1 className="text-4xl">Page not found</h1>
        <p className="mt-4 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Button asChild variant="gold" className="mt-8">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </div>
  );
}
