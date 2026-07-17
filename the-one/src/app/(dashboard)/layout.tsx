import Link from "next/link";
import { LayoutDashboard, FileText, MessageCircle, Calendar, Settings } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { siteConfig } from "@/config/site";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/application", label: "My Application", icon: FileText },
  { href: "/dashboard/messages", label: "Messages", icon: MessageCircle },
  { href: "/dashboard/dates", label: "Date Invitations", icon: Calendar },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Applicants only. Admins are redirected to /admin.
  const profile = await requireRole("applicant");

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-border bg-paper">
        <div className="container-editorial flex h-16 items-center justify-between">
          <Link href="/dashboard" className="font-serif text-xl">
            {siteConfig.name}
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {profile.full_name ?? profile.email}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">Sign out</Button>
            </form>
          </div>
        </div>
      </header>

      <div className="container-editorial grid gap-8 py-8 md:grid-cols-[220px_1fr]">
        <nav aria-label="Dashboard" className="flex flex-row gap-1 overflow-x-auto md:flex-col">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
