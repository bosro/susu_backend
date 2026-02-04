# ---------- BUILD STAGE ----------
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Prisma needs DATABASE_URL even for generate
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Run Prisma from local install (NO npx)
RUN ./node_modules/.bin/prisma generate --schema=src/prisma/schema.prisma

RUN npm run build


# ---------- RUNTIME STAGE ----------
FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src/prisma ./src/prisma

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

EXPOSE 5000
CMD ["node", "dist/server.js"]
