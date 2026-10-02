const root = new URL("../../../", import.meta.url).pathname;

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  outputFileTracingRoot: root,
  turbopack: { root },
};
