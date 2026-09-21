import type { NextConfig } from "next";

import { MAX_ACTION_BODY_BYTES } from "./src/lib/validation";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  experimental: {
    // Photos are posted through a server action, and the default cap is 1MB.
    serverActions: { bodySizeLimit: MAX_ACTION_BODY_BYTES },
  },
};

export default nextConfig;
