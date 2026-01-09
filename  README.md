# README.md

# Susu & Savings Collection API

A production-ready, multi-tenant backend API for managing Susu and savings collection operations. Built with Node.js, TypeScript, Express, Prisma, PostgreSQL, and Redis.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Security](#security)
- [Contributing](#contributing)

## ✨ Features

### Multi-Tenancy
- Complete data isolation between companies
- Custom branding per company (logo, colors)
- Scalable architecture supporting multiple organizations

### User Management
- Three role levels: Super Admin, Company Admin, Agent
- Role-based access control (RBAC)
- JWT authentication with refresh tokens
- Password encryption with bcrypt

### Core Functionality
- **Branch Management**: Multiple locations per company
- **Customer Management**: Customer profiles with photo uploads
- **Susu Plans**: Multiple savings plan types (Daily, Weekly, Fixed, Target-based)
- **Susu Accounts**: Individual customer savings accounts
- **Collections**: Daily collection recording with geolocation
- **Daily Summaries**: End-of-day reporting and locking
- **Reports**: Comprehensive analytics and performance reports
- **Notifications**: Real-time notifications system

### Technical Features
- RESTful API design
- PostgreSQL with Prisma ORM
- Redis caching
- File uploads to Cloudinary
- Audit logging
- Rate limiting
- Error handling
- Request validation with Joi
- Docker support
- Health checks

## 🛠 Tech Stack

- **Runtime**: Node.js (v20+)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (v16+)
- **ORM**: Prisma
- **Cache**: Redis
- **Authentication**: JWT
- **File Upload**: Cloudinary
- **Validation**: Joi
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting
- **Containerization**: Docker & Docker Compose

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v20 or higher)
- npm or yarn
- PostgreSQL (v16 or higher)
- Redis (v7 or higher)
- Docker & Docker Compose (optional)

## 🚀 Installation

### Option 1: Manual Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-username/susu-backend.git
cd susu-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and configure your environment variables.

4. **Generate Prisma Client**
```bash
npm run prisma:generate
```

5. **Run database migrations**
```bash
npm run prisma:migrate
```

6. **Seed the database**
```bash
npm run prisma:seed
```

7. **Start the development server**
```bash
npm run dev
```

### Option 2: Docker Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-username/susu-backend.git
cd susu-backend
```

2. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration.

3. **Run setup script**
```bash
chmod +x scripts/docker-setup.sh
./scripts/docker-setup.sh
```

The API will be available at `http://localhost:5000`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:
```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/susu_db?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend URL
FRONTEND_URL=http://localhost:4200

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg
```

## 🗄️ Database Setup

### Migrations

**Development:**
```bash
npm run prisma:migrate
```

**Production:**
```bash
npm run prisma:migrate:prod
```

### Seeding

Seed the database with initial data:
```bash
npm run prisma:seed
```

This creates:
- Super Admin account
- Demo company with admin and agent
- Demo branch
- Sample customers and susu plans

### Prisma Studio

View and edit your database:
```bash
npm run prisma:studio
```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Using Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Health Check
```bash
GET /health
```

### Authentication Endpoints

#### Register Company
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "SecurePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+233123456789",
  "companyName": "My Company",
  "companyEmail": "info@company.com",
  "companyPhone": "+233987654321",
  "companyAddress": "123 Main St, Accra"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "SecurePassword123"
}
```

#### Get Profile
```http
GET /api/v1/auth/profile
Authorization: Bearer <access_token>
```

### Companies Endpoints

#### Get All Companies (Super Admin)
```http
GET /api/v1/companies?page=1&limit=10
Authorization: Bearer <access_token>
```

#### Get Company Stats
```http
GET /api/v1/companies/:id/stats
Authorization: Bearer <access_token>
```

#### Update Company
```http
PATCH /api/v1/companies/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Company Name",
  "primaryColor": "#4F46E5"
}
```

#### Upload Company Logo
```http
POST /api/v1/companies/:id/logo
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

logo: <file>
```

### Users Endpoints

#### Create User (Agent/Admin)
```http
POST /api/v1/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "agent@company.com",
  "password": "AgentPassword123",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+233555123456",
  "role": "AGENT",
  "branchId": "branch-uuid"
}
```

#### Get All Users
```http
GET /api/v1/users?page=1&limit=10&role=AGENT
Authorization: Bearer <access_token>
```

### Branches Endpoints

#### Create Branch
```http
POST /api/v1/branches
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Main Branch",
  "address": "456 Branch Rd, Kumasi",
  "phone": "+233999888777"
}
```

#### Get Branch Stats
```http
GET /api/v1/branches/:id/stats
Authorization: Bearer <access_token>
```

### Customers Endpoints

#### Create Customer
```http
POST /api/v1/customers
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "Kwame",
  "lastName": "Mensah",
  "phone": "+233501234567",
  "email": "kwame@example.com",
  "address": "789 Customer Lane",
  "branchId": "branch-uuid"
}
```

#### Get Customer Stats
```http
GET /api/v1/customers/:id/stats
Authorization: Bearer <access_token>
```

### Collections Endpoints

#### Record Collection
```http
POST /api/v1/collections
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "customerId": "customer-uuid",
  "susuAccountId": "account-uuid",
  "amount": 50,
  "expectedAmount": 50,
  "status": "COLLECTED",
  "notes": "Regular daily collection",
  "latitude": "5.6037",
  "longitude": "-0.1870"
}
```

#### Get Collection Stats
```http
GET /api/v1/collections/stats?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <access_token>
```

### Reports Endpoints

#### Collection Report
```http
GET /api/v1/reports/collections?startDate=2024-01-01&endDate=2024-12-31&branchId=branch-uuid
Authorization: Bearer <access_token>
```

#### Agent Performance Report
```http
GET /api/v1/reports/agent-performance?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <access_token>
```

#### Financial Summary
```http
GET /api/v1/reports/financial-summary?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <access_token>
```

### Response Format

All API responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error description",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Paginated Response:**
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Example Test File
```typescript
// tests/auth.test.ts
import request from 'supertest';
import app from '../src/app';

describe('Auth Endpoints', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@demo.com',
          password: 'Admin@123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@demo.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
```

## 🚢 Deployment

### Deploy to Production Server

1. **Prepare the server**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Redis
sudo apt install redis-server

# Install PM2
sudo npm install -g pm2
```

2. **Clone and setup**
```bash
git clone https://github.com/your-username/susu-backend.git
cd susu-backend
npm ci --only=production
```

3. **Configure environment**
```bash
nano .env
# Add production values
```

4. **Setup database**
```bash
npm run prisma:generate
npm run prisma:migrate:prod
```

5. **Build and start**
```bash
npm run build
pm2 start dist/server.js --name susu-api
pm2 save
pm2 startup
```

### Deploy with Docker

1. **Build and push image**
```bash
docker build -t your-registry/susu-api:latest .
docker push your-registry/susu-api:latest
```

2. **On production server**
```bash
docker pull your-registry/susu-api:latest
docker-compose -f docker-compose.prod.yml up -d
```

### Environment-Specific Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    image: your-registry/susu-api:latest
    restart: always
    ports:
      - '5000:5000'
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_HOST: ${REDIS_HOST}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    networks:
      - susu-network

  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - susu-network

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - susu-network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    networks:
      - susu-network

networks:
  susu-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

### Nginx Configuration
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:5000;
    }

    server {
        listen 80;
        server_name api.yourdomain.com;

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

## 📁 Project Structure
```
susu-backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── cloudinary.ts
│   │   └── index.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── tenant.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── companies/
│   │   ├── users/
│   │   ├── branches/
│   │   ├── customers/
│   │   ├── susu-plans/
│   │   ├── susu-accounts/
│   │   ├── collections/
│   │   ├── daily-summaries/
│   │   ├── reports/
│   │   └── notifications/
│   ├── utils/
│   │   ├── jwt.util.ts
│   │   ├── bcrypt.util.ts
│   │   ├── response.util.ts
│   │   ├── pagination.util.ts
│   │   ├── file-upload.util.ts
│   │   ├── audit-log.util.ts
│   │   ├── account-number.util.ts
│   │   └── logger.util.ts
│   ├── types/
│   │   ├── express.d.ts
│   │   ├── enums.ts
│   │   └── interfaces.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── app.ts
│   └── server.ts
├── tests/
├── scripts/
│   ├── setup-dev.sh
│   ├── setup-prod.sh
│   └── docker-setup.sh
├── logs/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🔒 Security

### Best Practices Implemented

1. **Authentication & Authorization**
   - JWT with short-lived access tokens
   - Refresh token rotation
   - Role-based access control
   - Password hashing with bcrypt

2. **Data Protection**
   - Environment variables for secrets
   - SQL injection prevention (Prisma)
   - XSS protection (Helmet)
   - CORS configuration
   - Rate limiting

3. **Multi-Tenancy Security**
   - Strict data isolation per company
   - Tenant validation middleware
   - Scoped database queries

4. **API Security**
   - Request validation
   - File upload restrictions
   - Rate limiting per IP
   - Audit logging

### Security Checklist for Production

- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS only
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Set up monitoring
- [ ] Regular security updates
- [ ] Use environment variables

## 🔧 Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Verify connection string in .env
DATABASE_URL="postgresql://user:password@localhost:5432/susu_db"
```

**Redis Connection Error**
```bash
# Check if Redis is running
sudo systemctl status redis

# Test Redis connection
redis-cli ping
```

**Port Already in Use**
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

**Prisma Migration Issues**
```bash
# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# Force push schema
npx prisma db push --force-reset
```

## 📊 Monitoring

### PM2 Monitoring
```bash
# View logs
pm2 logs susu-api

# Monitor resources
pm2 monit

# View process info
pm2 info susu-api

# Restart application
pm2 restart susu-api
```

### Health Checks

The API includes a health check endpoint:
```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production"
}
```

## 📝 Default Login Credentials (After Seeding)

**Super Admin:**
- Email: `superadmin@susu.com`
- Password: `SuperAdmin@123`

**Company Admin:**
- Email: `admin@demo.com`
- Password: `Admin@123`

**Agent:**
- Email: `agent@demo.com`
- Password: `Agent@123`

⚠️ **IMPORTANT:** Change these passwords immediately in production!

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📧 Support

For support, email support@susuapp.com or open an issue on GitHub.

## 🙏 Acknowledgments

- Prisma team for the amazing ORM
- Express.js community
- All contributors

---

Built with ❤️ for the Susu community