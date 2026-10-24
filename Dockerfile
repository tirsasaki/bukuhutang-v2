# Buku Piutang (bukuhutang-v2) — Docker image
#
# Build:
#   docker build \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://nama-proyek.supabase.co \
#     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=kunci-publik-supabase \
#     -t buku-piutang .
#
# Catatan penting: NEXT_PUBLIC_* dibakar ke dalam bundle saat build
# (perilaku standar Next.js), jadi nilainya HARUS benar saat build,
# bukan hanya saat container jalan. Variabel server-only seperti
# GITHUB_BACKUP_* justru dibaca saat runtime, jadi cukup lewat
# environment container (lihat docker-compose.yml).
#
# Run (contoh, lihat docker-compose.yml untuk setup lengkap):
#   docker run --rm -p 3000:3000 --env-file .env buku-piutang

# ---- deps: install dependensi persis dari lockfile ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# ---- builder: build aplikasi ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build

# ---- runner: image akhir, hanya yang dibutuhkan untuk jalan ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN groupadd --system nodejs && useradd --system --gid nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
