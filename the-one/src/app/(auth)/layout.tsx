import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-ink p-12 text-paper lg:flex">
        <Link href="/" className="font-serif text-2xl">
          {siteConfig.name}
        </Link>
        <div>
          <p className="eyebrow mb-6 text-gold">{siteConfig.tagline}</p>
          <p className="max-w-md font-serif text-3xl leading-snug">
            A private invitation to pursue something real.
          </p>
        </div>
        <p className="text-xs text-paper/40">
          Private &amp; confidential. Your information is never public.
        </p>
      </div>
      <div className="flex items-center justify-center bg-paper p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="font-serif text-2xl">
              {siteConfig.name}
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
