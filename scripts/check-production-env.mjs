// A production deploy without a write password would ship unusable write
// pages, so the build stops instead. A local build and a preview build must
// run without the variable, so only production is held to it.
if (process.env.VERCEL_ENV !== "production") {
  process.exit(0);
}

if (!process.env.RECIPES_WRITE_PASSWORD) {
  console.error(
    "RECIPES_WRITE_PASSWORD is not set. Add it under Settings > Environment Variables in the Vercel project.",
  );
  process.exit(1);
}
