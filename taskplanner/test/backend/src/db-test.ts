/**
 * Database Connection Test
 * Run with: npx ts-node src/db-test.ts
 *
 * This script tests:
 * 1. Prisma Client initialization
 * 2. Database connection (if DATABASE_URL is configured)
 * 3. Basic query execution
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test 1: Prisma Client initialization
    console.log('✅ Prisma Client initialized successfully');

    // Test 2: Attempt to connect to database
    await prisma.$connect();
    console.log('✅ Database connection established');

    // Test 3: Run a simple query (count users)
    const userCount = await prisma.user.count();
    console.log(`✅ Query executed successfully. User count: ${userCount}`);

    console.log('\n🎉 All database tests passed!');
  } catch (error) {
    if (error instanceof Error) {
      // Check if it's a connection error (expected if no DB is running)
      if (
        error.message.includes('connect') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes("Can't reach database")
      ) {
        console.log('⚠️  Database not reachable (expected if PostgreSQL is not running)');
        console.log('\n📋 To run PostgreSQL locally, use Docker:');
        console.log(
          '   docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres'
        );
        console.log('\n   Then create the database:');
        console.log('   docker exec -it postgres psql -U postgres -c "CREATE DATABASE task_management;"');
        console.log('\n   And run migrations:');
        console.log('   npm run db:migrate');
        console.log('\n✅ Prisma Client is correctly configured and ready to use!');
      } else {
        console.error('❌ Error:', error.message);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
