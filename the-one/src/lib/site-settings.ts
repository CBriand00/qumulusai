import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";

/**
 * DB-backed content/settings that the admin can edit at runtime, with the
 * static `siteConfig` values as fallbacks. `site_content` is world-readable;
 * `system_settings` is admin-only for writes (see RLS).
 */
export interface SiteOverrides {
  applicationsOpen: boolean;
  heroHeadline: string;
  heroSubhead: string;
  tagline: string;
}

export async function getSiteOverrides(): Promise<SiteOverrides> {
  try {
    const supabase = createClient();
    const [{ data: content }, { data: settings }] = await Promise.all([
      supabase.from("site_content").select("key, value").returns<{ key: string; value: unknown }[]>(),
      supabase.from("system_settings").select("key, value").eq("key", "applications_open").maybeSingle<{ key: string; value: unknown }>(),
    ]);

    const map = new Map((content ?? []).map((c) => [c.key, c.value]));
    const str = (k: string, fallback: string) => {
      const v = map.get(k);
      return typeof v === "string" && v.trim() ? v : fallback;
    };

    return {
      applicationsOpen:
        settings?.value === undefined || settings?.value === null
          ? siteConfig.applicationsOpen
          : Boolean(settings.value),
      heroHeadline: str("hero_headline", siteConfig.heroHeadline),
      heroSubhead: str("hero_subhead", siteConfig.heroSubhead),
      tagline: str("tagline", siteConfig.tagline),
    };
  } catch {
    return {
      applicationsOpen: siteConfig.applicationsOpen,
      heroHeadline: siteConfig.heroHeadline,
      heroSubhead: siteConfig.heroSubhead,
      tagline: siteConfig.tagline,
    };
  }
}
