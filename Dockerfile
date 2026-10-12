# Image de production (voir compose.prod.yaml). Le développement utilise Dockerfile.dev.
FROM node:24-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Dépendances. --ignore-scripts : better-sqlite3 fournit déjà un binaire
#    précompilé pour linux-arm64 et linux-x64. Sans cette option, npm le recompile
#    (python, make, g++ : plusieurs minutes et beaucoup de mémoire sur un Raspberry).
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

# 2. Build. La limite de mémoire de Node évite que le build fasse tomber
#    un Raspberry de 4 Go (le reste de la mémoire sert au système et au site).
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

# 3. Exécution : seulement le serveur autonome, les fichiers statiques et les migrations.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
