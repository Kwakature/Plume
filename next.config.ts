import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le build produit un dossier .next/standalone autonome (serveur Node minimal),
  // c'est ce qu'embarque l'image de production.
  output: "standalone",
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
