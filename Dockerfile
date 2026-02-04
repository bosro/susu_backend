# =========================
# Production Dockerfile
# =========================
FROM node:20-alpine

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=src/prisma/schema.prisma

# Expose API port
EXPOSE 5000

CMD ["node", "dist/main.js"]
