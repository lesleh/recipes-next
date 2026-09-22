import type { NextConfig } from "next";

import { MAX_ACTION_BODY_BYTES } from "./src/lib/validation";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  experimental: {
    // Photos are posted through a server action, and the default cap is 1MB.
    serverActions: { bodySizeLimit: MAX_ACTION_BODY_BYTES },
    // The stylesheet is one render-blocking request in front of every page.
    // Tailwind's output is small enough to carry in the HTML instead.
    inlineCss: true,
  },
};

export default nextConfig;
