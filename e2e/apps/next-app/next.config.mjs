/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // The package ships ESM + CJS; Next must be able to consume it as published.
  outputFileTracingRoot: new URL("../../../", import.meta.url).pathname,
};
