import Link from "next/link";
import { LayoutGrid, Users, MessageSquare, Calendar, FileEdit, ScrollText, BarChart3, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { siteConfig } from "@/config/site";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/applicants", label: "Applicants", icon: Users },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/dates", label: "Dates", icon: Calendar },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/content", label: "Content", icon: FileEdit },
  { href: "/admin/privacy", label: "Privacy", icon: ShieldCheck },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin only. RLS is the ultimate guard; this gates the UI shell.
  const profile = await requireRole("admin");

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
        <aside className="border-r border-border bg-card">
          <div className="flex h-16 items-center border-b border-border px-6">
            <Link href="/admin" className="font-serif text-lg">
              {siteConfig.name}{" "}
              <span className="text-xs uppercase tracking-editorial text-gold">Admin</span>
            </Link>
          </div>
          <nav aria-label="Admin" className="space-y-1 p-4">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex flex-col">
          <header className="flex h-16 items-center justify-between border-b border-border px-6">
            <span className="text-sm text-muted-foreground">Private command center</span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{profile.email}</span>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">Sign out</Button>
              </form>
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
