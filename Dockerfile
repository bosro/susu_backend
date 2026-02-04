# Use Node 20 (matches your engines field)
FROM node:20-alpine

# Install required system dependencies for Prisma & sharp
RUN apk add --no-cache \
    openssl \
    libc6-compat

# Set working directory
WORKDIR /app

# Copy package files first (better Docker caching)
COPY package*.json ./

# Install ONLY production dependencies
# Prisma CLI is already pinned in devDependencies (5.9.1)
RUN npm ci --omit=dev

# Copy the rest of the source code
COPY . .

RUN npm run build

# Expose API port
EXPOSE 5000

# Start compiled app (Prisma runs at runtime, not build time)
CMD ["node", "dist/server.js"]
