# =========================
# 1️⃣ Build stage
# =========================
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build


# =========================
# 2️⃣ Production stage
# =========================
FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy built output + prisma + node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/prisma ./src/prisma
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 5000
CMD ["node", "dist/server.js"]
