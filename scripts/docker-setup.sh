#!/bin/bash
# scripts/docker-setup.sh

echo "🐳 Setting up Susu API with Docker..."

# Build and start containers
echo "📦 Building Docker containers..."
docker-compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run migrations
echo "🗄️  Running database migrations..."
docker-compose exec api npx prisma migrate deploy

# Seed database
echo "🌱 Seeding database..."
docker-compose exec api npm run prisma:seed

echo "✅ Docker setup complete!"
echo ""
echo "📊 Service Status:"
docker-compose ps
echo ""
echo "🎯 API is running at: http://localhost:5000"
echo "🔍 Check health: http://localhost:5000/health"