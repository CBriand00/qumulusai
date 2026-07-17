import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/looking-for", label: "What I'm Looking For" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/safety", label: "Safety & Privacy" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container-editorial flex h-20 items-center justify-between">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          {siteConfig.name}
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 lg:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild variant="gold" size="sm">
            <Link href="/apply">Apply for Consideration</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
