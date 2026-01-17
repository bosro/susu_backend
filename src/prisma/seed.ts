// src/prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { BcryptUtil } from "../utils/bcrypt.util";
import {
  UserRole,
  CompanyStatus,
  SusuPlanType,
  CollectionStatus,
  TransactionType,
} from "../types/enums";
import { AccountNumberUtil } from "../utils/account-number.util";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // ============================================
  // SUPER ADMIN
  // ============================================
  const superAdminPassword = await BcryptUtil.hash("SuperAdmin@123");
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@susu.com" },
    update: {},
    create: {
      email: "superadmin@susu.com",
      password: superAdminPassword,
      firstName: "Super",
      lastName: "Admin",
      phone: "+233200000000",
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log("✅ Super Admin created:", superAdmin.email);

  // ============================================
  // DEMO COMPANY
  // ============================================
  const demoCompany = await prisma.company.upsert({
    where: { email: "demo@company.com" },
    update: {},
    create: {
      name: "Demo Susu Company",
      email: "demo@company.com",
      phone: "+233123456789",
      address: "123 Main Street, Accra, Ghana",
      status: CompanyStatus.ACTIVE,
      primaryColor: "#4F46E5",
      secondaryColor: "#818CF8",
    },
  });

  console.log("✅ Demo Company created:", demoCompany.name);

  // ============================================
  // COMPANY ADMIN
  // ============================================
  const companyAdminPassword = await BcryptUtil.hash("Admin@123");
  const companyAdmin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      password: companyAdminPassword,
      firstName: "Company",
      lastName: "Admin",
      phone: "+233201111111",
      role: UserRole.COMPANY_ADMIN,
      companyId: demoCompany.id,
      isActive: true,
    },
  });

  console.log("✅ Company Admin created:", companyAdmin.email);

  // ============================================
  // BRANCHES (3 branches)
  // ============================================
  const branches = await Promise.all([
    prisma.branch.create({
      data: {
        companyId: demoCompany.id,
        name: "Accra Main Branch",
        address: "456 Independence Avenue, Accra, Ghana",
        phone: "+233301234567",
        isActive: true,
      },
    }),
    prisma.branch.create({
      data: {
        companyId: demoCompany.id,
        name: "Kumasi Branch",
        address: "789 Kejetia Road, Kumasi, Ghana",
        phone: "+233322345678",
        isActive: true,
      },
    }),
    prisma.branch.create({
      data: {
        companyId: demoCompany.id,
        name: "Takoradi Branch",
        address: "321 Market Circle, Takoradi, Ghana",
        phone: "+233312456789",
        isActive: true,
      },
    }),
  ]);

  console.log("✅ Branches created:", branches.length);

  // ============================================
  // AGENTS (2 agents per branch)
  // ============================================
  const agentPassword = await BcryptUtil.hash("Agent@123");

  const agents = await Promise.all([
    // Accra agents
    prisma.user.create({
      data: {
        email: "kwame.agent@demo.com",
        password: agentPassword,
        firstName: "Kwame",
        lastName: "Asante",
        phone: "+233501234567",
        role: UserRole.AGENT,
        companyId: demoCompany.id,
        branchId: branches[0].id,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "ama.agent@demo.com",
        password: agentPassword,
        firstName: "Ama",
        lastName: "Boateng",
        phone: "+233502234567",
        role: UserRole.AGENT,
        companyId: demoCompany.id,
        branchId: branches[0].id,
        isActive: true,
      },
    }),
    // Kumasi agents
    prisma.user.create({
      data: {
        email: "kofi.agent@demo.com",
        password: agentPassword,
        firstName: "Kofi",
        lastName: "Mensah",
        phone: "+233503234567",
        role: UserRole.AGENT,
        companyId: demoCompany.id,
        branchId: branches[1].id,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "akua.agent@demo.com",
        password: agentPassword,
        firstName: "Akua",
        lastName: "Owusu",
        phone: "+233504234567",
        role: UserRole.AGENT,
        companyId: demoCompany.id,
        branchId: branches[1].id,
        isActive: true,
      },
    }),
    // Takoradi agents
    prisma.user.create({
      data: {
        email: "yaw.agent@demo.com",
        password: agentPassword,
        firstName: "Yaw",
        lastName: "Opoku",
        phone: "+233505234567",
        role: UserRole.AGENT,
        companyId: demoCompany.id,
        branchId: branches[2].id,
        isActive: true,
      },
    }),
  ]);

  console.log("✅ Agents created:", agents.length);

  // ============================================
  // SUSU PLANS (Various types)
  // ============================================
  const susuPlans = await Promise.all([
    prisma.susuPlan.create({
      data: {
        companyId: demoCompany.id,
        name: "Daily Savings - GH₵10",
        description: "Save GH₵10 every day",
        type: SusuPlanType.DAILY,
        amount: 10,
        frequency: "daily",
        isActive: true,
      },
    }),
    prisma.susuPlan.create({
      data: {
        companyId: demoCompany.id,
        name: "Daily Savings - GH₵20",
        description: "Save GH₵20 every day",
        type: SusuPlanType.DAILY,
        amount: 20,
        frequency: "daily",
        isActive: true,
      },
    }),
    prisma.susuPlan.create({
      data: {
        companyId: demoCompany.id,
        name: "Weekly Savings - GH₵100",
        description: "Save GH₵100 every week",
        type: SusuPlanType.WEEKLY,
        amount: 100,
        frequency: "weekly",
        isActive: true,
      },
    }),
    prisma.susuPlan.create({
      data: {
        companyId: demoCompany.id,
        name: "Target Savings - GH₵5000",
        description: "Save towards a target of GH₵5000",
        type: SusuPlanType.TARGET_SAVINGS,
        amount: 50,
        targetAmount: 5000,
        frequency: "flexible",
        isActive: true,
      },
    }),
    prisma.susuPlan.create({
      data: {
        companyId: demoCompany.id,
        name: "90-Day Challenge",
        description: "Save for 90 days towards your goal",
        type: SusuPlanType.DURATION_BASED,
        amount: 30,
        duration: 90,
        targetAmount: 2700,
        frequency: "daily",
        isActive: true,
      },
    }),
  ]);

  console.log("✅ Susu Plans created:", susuPlans.length);

  // ============================================
  // CUSTOMERS (5 customers per branch)
  // ============================================
  const customerData = [
    // Accra customers
    {
      branch: 0,
      firstName: "Kwame",
      lastName: "Mensah",
      phone: "+233541234567",
      email: "kwame@example.com",
    },
    {
      branch: 0,
      firstName: "Akua",
      lastName: "Osei",
      phone: "+233542234567",
      email: "akua@example.com",
    },
    {
      branch: 0,
      firstName: "Kofi",
      lastName: "Adomako",
      phone: "+233543234567",
      email: "kofi@example.com",
    },
    {
      branch: 0,
      firstName: "Ama",
      lastName: "Frimpong",
      phone: "+233544234567",
      email: "ama@example.com",
    },
    {
      branch: 0,
      firstName: "Yaw",
      lastName: "Darko",
      phone: "+233545234567",
      email: "yaw@example.com",
    },
    // Kumasi customers
    {
      branch: 1,
      firstName: "Abena",
      lastName: "Yeboah",
      phone: "+233546234567",
      email: "abena@example.com",
    },
    {
      branch: 1,
      firstName: "Kwasi",
      lastName: "Appiah",
      phone: "+233547234567",
      email: "kwasi@example.com",
    },
    {
      branch: 1,
      firstName: "Adjoa",
      lastName: "Sarpong",
      phone: "+233548234567",
      email: "adjoa@example.com",
    },
    {
      branch: 1,
      firstName: "Kwabena",
      lastName: "Boadi",
      phone: "+233549234567",
      email: "kwabena@example.com",
    },
    {
      branch: 1,
      firstName: "Efua",
      lastName: "Kyei",
      phone: "+233540234567",
      email: "efua@example.com",
    },
    // Takoradi customers
    {
      branch: 2,
      firstName: "Kojo",
      lastName: "Ansah",
      phone: "+233551234567",
      email: "kojo@example.com",
    },
    {
      branch: 2,
      firstName: "Afua",
      lastName: "Asiedu",
      phone: "+233552234567",
      email: "afua@example.com",
    },
    {
      branch: 2,
      firstName: "Fiifi",
      lastName: "Eshun",
      phone: "+233553234567",
      email: "fiifi@example.com",
    },
  ];

  const customers = await Promise.all(
    customerData.map((data, index) =>
      prisma.customer.create({
        data: {
          companyId: demoCompany.id,
          branchId: branches[data.branch].id,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email,
          address: `${index + 1} Customer Street, Ghana`,
          idNumber: `GHA${Math.random().toString().substring(2, 11)}`,
          isActive: true,
        },
      })
    )
  );

  console.log("✅ Customers created:", customers.length);

  // ============================================
  // SUSU ACCOUNTS (1-2 accounts per customer)
  // ============================================
  const susuAccounts = [];

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    // Each customer gets 1 or 2 accounts
    const accountCount = i % 3 === 0 ? 2 : 1;

    for (let j = 0; j < accountCount; j++) {
      const plan = susuPlans[Math.floor(Math.random() * susuPlans.length)];
      const account = await prisma.susuAccount.create({
        data: {
          customerId: customer.id,
          susuPlanId: plan.id,
          accountNumber: AccountNumberUtil.generate("SUS"),
          balance: 0, // We'll update this with collections
          targetAmount: plan.targetAmount || Number(plan.amount) * 30,
          startDate: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ), // Random date in last 30 days
          isActive: true,
        },
      });
      susuAccounts.push(account);
    }
  }

  console.log("✅ Susu Accounts created:", susuAccounts.length);

  // ============================================
  // COLLECTIONS (Last 14 days of activity)
  // ============================================
  console.log("📝 Creating collection history...");

  const today = new Date();
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

  let collectionsCreated = 0;
  let totalAmount = 0;

  // Create collections for last 14 days
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const collectionDate = new Date(
      fourteenDaysAgo.getTime() + dayOffset * 24 * 60 * 60 * 1000
    );

    // Each active account has a chance of collection
    for (const account of susuAccounts) {
      // Find which branch this account belongs to
      const customer = customers.find((c) => c.id === account.customerId);
      if (!customer) continue;

      const branch = branches.find((b) => b.id === customer.branchId);
      if (!branch) continue;

      // Find an agent from this branch
      const branchAgents = agents.filter((a) => a.branchId === branch.id);
      if (branchAgents.length === 0) continue;

      const agent =
        branchAgents[Math.floor(Math.random() * branchAgents.length)];
      const plan = susuPlans.find((p) => p.id === account.susuPlanId);
      if (!plan) continue;

      // 80% chance of collection happening
      if (Math.random() < 0.8) {
        // 90% collected, 5% partial, 5% missed
        const rand = Math.random();
        let status: CollectionStatus;
        let amount: number;

        if (rand < 0.9) {
          status = CollectionStatus.COLLECTED;
          amount = Number(plan.amount);
        } else if (rand < 0.95) {
          status = CollectionStatus.PARTIAL;
          amount = Number(plan.amount) * 0.5; // Half payment
        } else {
          status = CollectionStatus.MISSED;
          amount = 0;
        }

        // Create collection
        await prisma.collection.create({
          data: {
            companyId: demoCompany.id,
            branchId: branch.id,
            customerId: customer.id,
            susuAccountId: account.id,
            agentId: agent.id,
            amount: amount,
            expectedAmount: Number(plan.amount),
            collectionDate: collectionDate,
            status: status,
            notes:
              status === CollectionStatus.MISSED
                ? "Customer not available"
                : status === CollectionStatus.PARTIAL
                  ? "Partial payment made"
                  : "Collection successful",
          },
        });

        collectionsCreated++;

        // Update account balance and create transaction if money was collected
        if (amount > 0) {
          const currentBalance = Number(account.balance);
          const newBalance = currentBalance + amount;

          await prisma.susuAccount.update({
            where: { id: account.id },
            data: { balance: newBalance },
          });

          await prisma.transaction.create({
            data: {
              susuAccountId: account.id,
              type: TransactionType.DEPOSIT,
              amount: amount,
              balanceBefore: currentBalance,
              balanceAfter: newBalance,
              reference: AccountNumberUtil.generateReference("COL"),
              description: `Collection by ${agent.firstName} ${agent.lastName}`,
              createdAt: collectionDate,
            },
          });

          totalAmount += amount;

          // Update the account object for next iteration
          account.balance = new Decimal(newBalance);
        }
      }
    }
  }

  console.log(
    `✅ Collections created: ${collectionsCreated} (Total: GH₵${totalAmount.toFixed(2)})`
  );

  // ============================================
  // DAILY SUMMARIES (for last 7 days)
  // ============================================
  console.log("📊 Creating daily summaries...");

  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const summaryDate = new Date(
      sevenDaysAgo.getTime() + dayOffset * 24 * 60 * 60 * 1000
    );
    summaryDate.setHours(0, 0, 0, 0);

    for (const agent of agents) {
      const branch = branches.find((b) => b.id === agent.branchId);
      if (!branch) continue;

      // Get collections for this agent on this date
      const agentCollections = await prisma.collection.findMany({
        where: {
          agentId: agent.id,
          collectionDate: {
            gte: summaryDate,
            lt: new Date(summaryDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (agentCollections.length > 0) {
        const totalExpected = agentCollections.reduce(
          (sum, c) => sum + Number(c.expectedAmount || 0),
          0
        );
        const totalCollected = agentCollections.reduce(
          (sum, c) => sum + Number(c.amount),
          0
        );
        const missedCount = agentCollections.filter(
          (c) => c.status === CollectionStatus.MISSED
        ).length;
        const uniqueCustomers = new Set(
          agentCollections.map((c) => c.customerId)
        ).size;

        await prisma.dailySummary.create({
          data: {
            companyId: demoCompany.id,
            branchId: branch.id,
            agentId: agent.id,
            date: summaryDate,
            totalExpected: totalExpected,
            totalCollected: totalCollected,
            totalCustomers: uniqueCustomers,
            collectionsCount: agentCollections.length,
            missedCount: missedCount,
            isLocked: dayOffset < 5, // Lock summaries older than 2 days
            notes: `Summary for ${agent.firstName} ${agent.lastName}`,
          },
        });
      }
    }
  }

  console.log("✅ Daily summaries created");

  // ============================================
  // SUMMARY STATISTICS
  // ============================================
  console.log("\n📊 Database Statistics:");
  console.log("─────────────────────────────────────────────");

  const stats = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.branch.count(),
    prisma.customer.count(),
    prisma.susuPlan.count(),
    prisma.susuAccount.count(),
    prisma.collection.count(),
    prisma.transaction.count(),
    prisma.dailySummary.count(),
  ]);

  console.log(`Total Users: ${stats[0]}`);
  console.log(`Total Companies: ${stats[1]}`);
  console.log(`Total Branches: ${stats[2]}`);
  console.log(`Total Customers: ${stats[3]}`);
  console.log(`Total Susu Plans: ${stats[4]}`);
  console.log(`Total Susu Accounts: ${stats[5]}`);
  console.log(`Total Collections: ${stats[6]}`);
  console.log(`Total Transactions: ${stats[7]}`);
  console.log(`Total Daily Summaries: ${stats[8]}`);

  // Calculate total balance across all accounts
  const totalBalances = await prisma.susuAccount.aggregate({
    _sum: { balance: true },
  });

  console.log(
    `Total Money in System: GH₵${Number(totalBalances._sum.balance || 0).toFixed(2)}`
  );

  console.log("\n🎉 Seeding completed successfully!");
  console.log("\n📝 Login Credentials:");
  console.log("┌─────────────────────────────────────────────────┐");
  console.log("│ Super Admin:                                    │");
  console.log("│   Email: superadmin@susu.com                    │");
  console.log("│   Password: SuperAdmin@123                      │");
  console.log("│   Access: All companies, all features           │");
  console.log("├─────────────────────────────────────────────────┤");
  console.log("│ Company Admin:                                  │");
  console.log("│   Email: admin@demo.com                         │");
  console.log("│   Password: Admin@123                           │");
  console.log("│   Access: Demo Company only, all features       │");
  console.log("├─────────────────────────────────────────────────┤");
  console.log("│ Agents (5 total):                               │");
  console.log("│   Accra Branch:                                 │");
  console.log("│     - kwame.agent@demo.com / Agent@123          │");
  console.log("│     - ama.agent@demo.com / Agent@123            │");
  console.log("│   Kumasi Branch:                                │");
  console.log("│     - kofi.agent@demo.com / Agent@123           │");
  console.log("│     - akua.agent@demo.com / Agent@123           │");
  console.log("│   Takoradi Branch:                              │");
  console.log("│     - yaw.agent@demo.com / Agent@123            │");
  console.log("│   Access: Own collections only, limited features│");
  console.log("└─────────────────────────────────────────────────┘\n");

  console.log("💡 Tips for Testing:");
  console.log("  • Login as different roles to see different views");
  console.log("  • Agents can only see their own collections");
  console.log("  • Company admin can see all data for Demo Company");
  console.log("  • Super admin can see everything");
  console.log("  • Check dashboard for statistics and charts");
  console.log("  • View reports to see performance metrics");
  console.log("  • Try recording new collections as an agent\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
