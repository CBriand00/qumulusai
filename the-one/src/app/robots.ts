import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/** Keep private surfaces out of search indexes. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/application", "/apply", "/auth"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
