#!/bin/bash
# scripts/setup-dev.sh

echo "🚀 Setting up Susu API Development Environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev

# Seed database
echo "🌱 Seeding database..."
npm run prisma:seed

echo "✅ Development environment setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  1. Update .env file with your configuration"
echo "  2. Run 'npm run dev' to start development server"
echo "  3. Visit http://localhost:5000/health to verify"