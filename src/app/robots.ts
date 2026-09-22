import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Both need the write password, so a crawler only ever gets a 401 here.
      disallow: ["/recipes/new", "/recipes/*/edit"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
