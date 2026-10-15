import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le build produit un dossier .next/standalone autonome (serveur Node minimal),
  // c'est ce qu'embarque l'image de production.
  output: "standalone",
  experimental: {
    agentFeedback: true,
    // Les server actions (créer, renommer, sauvegarder…) sont refusées si l'adresse
    // vue par le navigateur diffère de celle reçue par le serveur (protection CSRF).
    // On déclare ici l'adresse du Raspberry via le VPN.
    serverActions: {
      allowedOrigins: ["100.124.13.32:3000", "192.168.1.103:3000"],
    },
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
