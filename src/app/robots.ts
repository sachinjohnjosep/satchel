import type { MetadataRoute } from "next";
import { isProduction, siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  // Preview deployments are never indexed.
  if (!isProduction) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/search"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
