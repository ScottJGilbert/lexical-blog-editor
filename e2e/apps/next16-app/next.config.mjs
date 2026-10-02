const root = new URL("../../../", import.meta.url).pathname;

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The package is consumed through pnpm workspace symlinks that point outside the app.
  outputFileTracingRoot: root,
  turbopack: { root },
};
