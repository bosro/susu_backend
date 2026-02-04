FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat


WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN npx prisma@5.9.1 generate --schema=src/prisma/schema.prisma

EXPOSE 5000
CMD ["node", "dist/server.js"]
