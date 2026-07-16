import Link from "next/link";
import { siteConfig } from "@/config/site";

const legalLinks = [
  { href: "/legal/terms", label: "Terms of Use" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/community-standards", label: "Community Standards" },
  { href: "/legal/consent", label: "Consent & Disclosure" },
  { href: "/legal/data-deletion", label: "Data Deletion" },
  { href: "/legal/cookies", label: "Cookie Policy" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-espresso text-paper">
      <div className="container-editorial grid gap-10 py-16 md:grid-cols-3">
        <div>
          <p className="font-serif text-2xl">{siteConfig.name}</p>
          <p className="mt-3 max-w-xs text-sm text-paper/70">{siteConfig.tagline}</p>
        </div>

        <div>
          <p className="eyebrow text-paper/60">Explore</p>
          <ul className="mt-4 space-y-2 text-sm text-paper/80">
            <li><Link href="/about" className="hover:text-gold">About</Link></li>
            <li><Link href="/how-it-works" className="hover:text-gold">How It Works</Link></li>
            <li><Link href="/safety" className="hover:text-gold">Safety &amp; Privacy</Link></li>
            <li><Link href="/faq" className="hover:text-gold">FAQ</Link></li>
            <li><Link href="/apply" className="hover:text-gold">Apply</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow text-paper/60">Legal</p>
          <ul className="mt-4 space-y-2 text-sm text-paper/80">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-gold">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="container-editorial flex flex-col gap-2 py-6 text-xs text-paper/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.legalEntity}. All rights reserved.</p>
          <p>A private, application-based matchmaking experience.</p>
        </div>
      </div>
    </footer>
  );
}
