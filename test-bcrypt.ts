// test-bcrypt.ts
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBcrypt() {
  console.log('🧪 Testing bcrypt functionality...\n');

  // Test 1: Basic hash and compare
  console.log('=== Test 1: Basic Hash & Compare ===');
  const testPassword = 'Admin@123';
  const hash = await bcrypt.hash(testPassword, 10);
  console.log('Original password:', testPassword);
  console.log('Generated hash:', hash);
  console.log('Hash length:', hash.length);
  
  const isValid = await bcrypt.compare(testPassword, hash);
  console.log('Comparison result (should be true):', isValid);
  
  const isInvalid = await bcrypt.compare('WrongPassword', hash);
  console.log('Wrong password (should be false):', isInvalid);
  console.log('');

  // Test 2: Check database password
  console.log('=== Test 2: Database Password Check ===');
  const user = await prisma.user.findUnique({
    where: { email: 'admin@demo.com' },
    select: {
      email: true,
      password: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    console.log('❌ User not found in database!');
    console.log('Run the seed script first: npm run seed');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ User found:', user.email);
  console.log('Role:', user.role);
  console.log('Is Active:', user.isActive);
  console.log('Password hash from DB:', user.password);
  console.log('Hash length from DB:', user.password.length);
  console.log('');

  // Test 3: Compare with database password
  console.log('=== Test 3: Password Comparison with DB ===');
  const passwords = ['Admin@123', 'admin@123', 'ADMIN@123', 'Admin@123 '];
  
  for (const pwd of passwords) {
    const result = await bcrypt.compare(pwd, user.password);
    console.log(`Password: "${pwd}" -> ${result ? '✅ MATCH' : '❌ NO MATCH'}`);
  }
  console.log('');

  // Test 4: Re-hash and compare
  console.log('=== Test 4: Re-hash Test Password ===');
  const newHash = await bcrypt.hash('Admin@123', 10);
  console.log('New hash:', newHash);
  const newComparison = await bcrypt.compare('Admin@123', newHash);
  console.log('New hash comparison:', newComparison ? '✅ SUCCESS' : '❌ FAILED');
  console.log('');

  // Test 5: Check if DB hash is valid bcrypt format
  console.log('=== Test 5: Hash Format Validation ===');
  const bcryptPattern = /^\$2[aby]\$\d{2}\$/;
  const isValidFormat = bcryptPattern.test(user.password);
  console.log('Hash starts with:', user.password.substring(0, 7));
  console.log('Is valid bcrypt format:', isValidFormat ? '✅ YES' : '❌ NO');
  
  if (!isValidFormat) {
    console.log('⚠️  WARNING: The password in the database is not a valid bcrypt hash!');
    console.log('This might be a plain text password or incorrectly hashed.');
  }

  await prisma.$disconnect();
  
  console.log('\n=== Summary ===');
  if (isValid && newComparison && isValidFormat) {
    console.log('✅ All bcrypt tests passed!');
    console.log('The issue might be:');
    console.log('1. Wrong password being entered (case-sensitive!)');
    console.log('2. Extra spaces in the password');
    console.log('3. Database password was not properly hashed during seeding');
  } else {
    console.log('❌ Some tests failed. Check the results above.');
  }
}

testBcrypt().catch((error) => {
  console.error('Error running tests:', error);
  process.exit(1);
});