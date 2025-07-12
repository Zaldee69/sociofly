#!/usr/bin/env npx tsx

import { performance } from 'perf_hooks';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PerformanceMetrics {
  queryTime: number;
  totalTime: number;
  recordCount: number;
  cacheHit: boolean;
}

interface PerformanceReport {
  timestamp: Date;
  endpoint: string;
  metrics: PerformanceMetrics;
  recommendations: string[];
}

async function monitorPagePerformance() {
  console.log('🔍 Starting page performance monitoring...');
  
  const reports: PerformanceReport[] = [];
  
  // Test calendar page performance
  const calendarReport = await testCalendarPerformance();
  reports.push(calendarReport);
  
  // Test post queries performance
  const postQueryReport = await testPostQueryPerformance();
  reports.push(postQueryReport);
  
  // Generate summary report
  generateSummaryReport(reports);
  
  await prisma.$disconnect();
}

async function testCalendarPerformance(): Promise<PerformanceReport> {
  console.log('\n📅 Testing calendar page performance...');
  
  const startTime = performance.now();
  
  try {
    const queryStartTime = performance.now();
    
    // Simulate the calendar query
    const posts = await prisma.post.findMany({
      take: 100,
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
    
    const queryEndTime = performance.now();
    const totalEndTime = performance.now();
    
    const queryTime = queryEndTime - queryStartTime;
    const totalTime = totalEndTime - startTime;
    
    console.log(`⚡ Calendar query: ${queryTime.toFixed(2)}ms`);
    console.log(`📊 Total posts loaded: ${posts.length}`);
    
    const recommendations = generateRecommendations({
      queryTime,
      totalTime,
      recordCount: posts.length,
      cacheHit: false,
    });
    
    return {
      timestamp: new Date(),
      endpoint: '/calendar',
      metrics: {
        queryTime,
        totalTime,
        recordCount: posts.length,
        cacheHit: false,
      },
      recommendations,
    };
    
  } catch (error) {
    console.error('❌ Calendar performance test failed:', error);
    throw error;
  }
}

async function testPostQueryPerformance(): Promise<PerformanceReport> {
  console.log('\n📝 Testing post query performance...');
  
  const startTime = performance.now();
  
  try {
    const queryStartTime = performance.now();
    
    // Test different query patterns
    const [allPosts, recentPosts, scheduledPosts] = await Promise.all([
      prisma.post.findMany({ take: 50 }),
      prisma.post.findMany({
        take: 20,
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
      prisma.post.findMany({
        take: 30,
        where: {
          scheduledAt: {
            gte: new Date(),
          },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);
    
    const queryEndTime = performance.now();
    const totalEndTime = performance.now();
    
    const queryTime = queryEndTime - queryStartTime;
    const totalTime = totalEndTime - startTime;
    const totalRecords = allPosts.length + recentPosts.length + scheduledPosts.length;
    
    console.log(`⚡ Post queries: ${queryTime.toFixed(2)}ms`);
    console.log(`📊 Total records: ${totalRecords}`);
    
    const recommendations = generateRecommendations({
      queryTime,
      totalTime,
      recordCount: totalRecords,
      cacheHit: false,
    });
    
    return {
      timestamp: new Date(),
      endpoint: '/api/trpc/post.getAll',
      metrics: {
        queryTime,
        totalTime,
        recordCount: totalRecords,
        cacheHit: false,
      },
      recommendations,
    };
    
  } catch (error) {
    console.error('❌ Post query performance test failed:', error);
    throw error;
  }
}

function generateRecommendations(metrics: PerformanceMetrics): string[] {
  const recommendations: string[] = [];
  
  // Query time recommendations
  if (metrics.queryTime > 5000) {
    recommendations.push('🚨 CRITICAL: Query time >5s - Consider database optimization');
    recommendations.push('💡 Add database indexes for frequently queried columns');
    recommendations.push('💡 Implement query result caching');
  } else if (metrics.queryTime > 1000) {
    recommendations.push('⚠️  WARNING: Query time >1s - Performance optimization needed');
    recommendations.push('💡 Consider adding pagination or limiting results');
  } else if (metrics.queryTime > 500) {
    recommendations.push('🟡 MODERATE: Query time >500ms - Room for improvement');
  }
  
  // Record count recommendations
  if (metrics.recordCount > 1000) {
    recommendations.push('📊 Large dataset detected - Implement pagination');
    recommendations.push('💡 Consider virtual scrolling for large lists');
  } else if (metrics.recordCount > 500) {
    recommendations.push('📊 Medium dataset - Consider lazy loading');
  }
  
  // Cache recommendations
  if (!metrics.cacheHit) {
    recommendations.push('🗄️  Implement query result caching');
    recommendations.push('💡 Use React Query staleTime and cacheTime');
  }
  
  // General performance recommendations
  if (metrics.totalTime > 3000) {
    recommendations.push('🔄 Consider implementing loading states');
    recommendations.push('💡 Add skeleton loaders for better UX');
  }
  
  return recommendations;
}

function generateSummaryReport(reports: PerformanceReport[]) {
  console.log('\n📋 PERFORMANCE SUMMARY REPORT');
  console.log('=' .repeat(50));
  
  reports.forEach((report, index) => {
    console.log(`\n${index + 1}. ${report.endpoint}`);
    console.log(`   ⏱️  Query Time: ${report.metrics.queryTime.toFixed(2)}ms`);
    console.log(`   🕐 Total Time: ${report.metrics.totalTime.toFixed(2)}ms`);
    console.log(`   📊 Records: ${report.metrics.recordCount}`);
    console.log(`   🗄️  Cache Hit: ${report.metrics.cacheHit ? '✅' : '❌'}`);
    
    if (report.recommendations.length > 0) {
      console.log('   💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`      ${rec}`);
      });
    }
  });
  
  // Overall recommendations
  console.log('\n🎯 PRIORITY ACTIONS:');
  console.log('1. Run database optimization: npm run db:optimize');
  console.log('2. Monitor Redis performance: npm run redis:monitor-rate');
  console.log('3. Check Sentry traces for slow queries');
  console.log('4. Implement query result caching where needed');
  
  console.log('\n✅ Performance monitoring completed!');
}

// Run monitoring if script is executed directly
if (require.main === module) {
  monitorPagePerformance()
    .then(() => {
      console.log('\n🎉 Performance monitoring completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Performance monitoring failed:', error);
      process.exit(1);
    });
}

export { monitorPagePerformance, testCalendarPerformance, testPostQueryPerformance };