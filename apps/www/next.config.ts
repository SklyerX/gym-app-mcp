import path from "node:path";
import type { NextConfig } from "next";

const tunnelHost = process.env.NEXT_PUBLIC_SITE_HOST;

const nextConfig: NextConfig = {
  turbopack: {
    // apps/www is its own git repository, so Turbopack ignores the workspace
    // file above it and scopes resolution to this directory — where pnpm has
    // only symlinks into the hoisted store at the monorepo root. Pointing the
    // root at the monorepo makes `next` and the rest resolvable.
    root: path.resolve(__dirname, "../.."),
  },
  allowedDevOrigins: tunnelHost ? [tunnelHost, `*.${tunnelHost}`] : [],
};

export default nextConfig;
