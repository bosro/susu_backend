#!/bin/bash
# scripts/setup-prod.sh

echo "🚀 Setting up Susu API Production Environment..."

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🗄️  Running production migrations..."
npx prisma migrate deploy

# Build application
echo "🏗️  Building application..."
npm run build

echo "✅ Production environment setup complete!"
echo ""
echo "🎯 Start the application with: npm start"