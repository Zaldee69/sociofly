#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function optimizeDatabasePerformance() {
  console.log('🚀 Starting database performance optimization...');
  
  try {
    // Read and execute SQL optimization script
    const sqlScript = readFileSync(
      join(__dirname, 'optimize-post-queries.sql'),
      'utf-8'
    );
    
    // Split SQL commands and execute them
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Executing ${commands.length} optimization commands...`);
    
    for (const command of commands) {
      if (command.toLowerCase().includes('create index')) {
        console.log(`🔧 Creating index: ${command.split('idx_')[1]?.split(' ')[0] || 'unknown'}`);
      } else if (command.toLowerCase().includes('analyze')) {
        console.log(`📊 Analyzing table: ${command.split('"')[1] || 'unknown'}`);
      }
      
      await prisma.$executeRawUnsafe(command);
    }
    
    console.log('✅ Database optimization completed successfully!');
    
    // Test query performance
    console.log('\n🧪 Testing query performance...');
    await testQueryPerformance();
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function testQueryPerformance() {
  const startTime = Date.now();
  
  try {
    // Test the optimized post query
    const result = await prisma.post.findMany({
      take: 50,
      orderBy: { scheduledAt: 'asc' },
      include: {
        postSocialAccounts: {
          include: {
            socialAccount: {
              select: {
                id: true,
                name: true,
                platform: true,
                profilePicture: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⚡ Query completed in ${duration}ms`);
    console.log(`📊 Retrieved ${result.length} posts`);
    
    if (duration > 1000) {
      console.log('⚠️  Query is still slow (>1s). Consider further optimization.');
    } else if (duration > 500) {
      console.log('🟡 Query performance is moderate (>500ms).');
    } else {
      console.log('🟢 Query performance is good (<500ms).');
    }
    
  } catch (error) {
    console.error('❌ Query performance test failed:', error);
  }
}

// Run optimization if script is executed directly
if (require.main === module) {
  optimizeDatabasePerformance()
    .then(() => {
      console.log('\n🎉 Database optimization process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database optimization process failed:', error);
      process.exit(1);
    });
}

export { optimizeDatabasePerformance, testQueryPerformance };