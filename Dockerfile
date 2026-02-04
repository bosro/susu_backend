# ---------- BUILD STAGE ----------
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install deps first (better cache)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma Client (PINNED VERSION)
RUN npx prisma@5.9.1 generate --schema=src/prisma/schema.prisma

# Build TS
RUN npm run build


# ---------- RUNTIME STAGE ----------
FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy only what is needed at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Prisma needs schema at runtime sometimes (migrations / introspection safety)
COPY --from=builder /app/src/prisma ./src/prisma

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "dist/server.js"]
