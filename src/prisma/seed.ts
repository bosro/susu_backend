// src/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { BcryptUtil } from '../utils/bcrypt.util';
import { UserRole, CompanyStatus } from '../types/enums';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Super Admin
  const superAdminPassword = await BcryptUtil.hash('SuperAdmin@123');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@susu.com' },
    update: {},
    create: {
      email: 'superadmin@susu.com',
      password: superAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Super Admin created:', superAdmin.email);

  // Create Demo Company
  const demoCompany = await prisma.company.upsert({
    where: { email: 'demo@company.com' },
    update: {},
    create: {
      name: 'Demo Susu Company',
      email: 'demo@company.com',
      phone: '+233123456789',
      address: '123 Main Street, Accra, Ghana',
      status: CompanyStatus.ACTIVE,
      primaryColor: '#4F46E5',
      secondaryColor: '#818CF8',
    },
  });

  console.log('✅ Demo Company created:', demoCompany.name);

  // Create Company Admin
  const companyAdminPassword = await BcryptUtil.hash('Admin@123');
  const companyAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      password: companyAdminPassword,
      firstName: 'Company',
      lastName: 'Admin',
      role: UserRole.COMPANY_ADMIN,
      companyId: demoCompany.id,
      isActive: true,
    },
  });

  console.log('✅ Company Admin created:', companyAdmin.email);

  // Create Demo Branch
  const demoBranch = await prisma.branch.create({
    data: {
      companyId: demoCompany.id,
      name: 'Main Branch',
      address: '456 Branch Road, Kumasi, Ghana',
      phone: '+233987654321',
      isActive: true,
    },
  });

  console.log('✅ Demo Branch created:', demoBranch.name);

  // Create Demo Agent
  const agentPassword = await BcryptUtil.hash('Agent@123');
  const demoAgent = await prisma.user.create({
    data: {
      email: 'agent@demo.com',
      password: agentPassword,
      firstName: 'Demo',
      lastName: 'Agent',
      role: UserRole.AGENT,
      companyId: demoCompany.id,
      branchId: demoBranch.id,
      isActive: true,
    },
  });

  console.log('✅ Demo Agent created:', demoAgent.email);

  // Create Demo Susu Plans
  const dailyPlan = await prisma.susuPlan.create({
    data: {
      companyId: demoCompany.id,
      name: 'Daily Savings Plan',
      description: 'Save a fixed amount daily',
      type: 'DAILY',
      amount: 10,
      frequency: 'daily',
      isActive: true,
    },
  });

  const weeklyPlan = await prisma.susuPlan.create({
    data: {
      companyId: demoCompany.id,
      name: 'Weekly Savings Plan',
      description: 'Save a fixed amount weekly',
      type: 'WEEKLY',
      amount: 50,
      frequency: 'weekly',
      isActive: true,
    },
  });

  console.log('✅ Demo Susu Plans created');

  // Create Demo Customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        companyId: demoCompany.id,
        branchId: demoBranch.id,
        firstName: 'Kwame',
        lastName: 'Mensah',
        phone: '+233501234567',
        email: 'kwame@example.com',
        address: '789 Customer Lane, Accra',
        isActive: true,
      },
    }),
    prisma.customer.create({
      data: {
        companyId: demoCompany.id,
        branchId: demoBranch.id,
        firstName: 'Akua',
        lastName: 'Osei',
        phone: '+233509876543',
        email: 'akua@example.com',
        address: '321 Client Street, Kumasi',
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Demo Customers created:', customers.length);

  // Create Demo Susu Accounts
  for (const customer of customers) {
    await prisma.susuAccount.create({
      data: {
        customerId: customer.id,
        susuPlanId: dailyPlan.id,
        accountNumber: `SUS${Date.now()}${Math.floor(Math.random() * 1000)}`,
        balance: 0,
        targetAmount: 1000,
        startDate: new Date(),
        isActive: true,
      },
    });
  }

  console.log('✅ Demo Susu Accounts created');

  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n📝 Login Credentials:');
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│ Super Admin:                                    │');
  console.log('│   Email: superadmin@susu.com                    │');
  console.log('│   Password: SuperAdmin@123                      │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│ Company Admin:                                  │');
  console.log('│   Email: admin@demo.com                         │');
  console.log('│   Password: Admin@123                           │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│ Agent:                                          │');
  console.log('│   Email: agent@demo.com                         │');
  console.log('│   Password: Agent@123                           │');
  console.log('└─────────────────────────────────────────────────┘\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });