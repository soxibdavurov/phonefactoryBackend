# ---------- 1-bosqich: TypeScript'ni JavaScript'ga build qilish ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Avval faqat package fayllarini nusxalaymiz: kod o'zgarsa ham
# "npm ci" qatlami keshdan olinadi va build tezlashadi
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- 2-bosqich: faqat ishlash uchun kerakli narsalar ----------
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Rasm yuklash papkalari (docker-compose'da volume sifatida ulanadi)
RUN mkdir -p uploads/members uploads/products && chown -R node:node /app
USER node

EXPOSE 3004
CMD ["node", "dist/server.js"]
