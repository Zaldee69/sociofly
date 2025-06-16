#!/usr/bin/env tsx

/**
 * Debug Hotspot Analysis
 * 
 * This script directly tests the hotspot analysis function to identify issues
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugHotspotAnalysis() {
  console.log('🔍 Debug Hotspot Analysis\n');
  
  try {
    // Step 1: Check social accounts
    console.log('1️⃣ Checking social accounts...');
    const socialAccounts = await prisma.socialAccount.findMany({
      select: {
        id: true,
        name: true,
        platform: true,
        teamId: true,
        accessToken: true,
        profileId: true,
      },
    });
    
    console.log(`📊 Found ${socialAccounts.length} social accounts:`);
    socialAccounts.forEach((acc, index) => {
      console.log(`   ${index + 1}. ${acc.platform} - ${acc.name} (${acc.id})`);
      console.log(`      Team: ${acc.teamId}`);
      console.log(`      Has Token: ${acc.accessToken ? '✅' : '❌'}`);
      console.log(`      Profile ID: ${acc.profileId || 'N/A'}`);
    });
    console.log('');
    
    if (socialAccounts.length === 0) {
      console.log('❌ No social accounts found. Hotspot analysis requires social accounts.');
      return;
    }
    
    // Step 2: Check existing hotspots
    console.log('2️⃣ Checking existing hotspots...');
    const existingHotspots = await prisma.engagementHotspot.findMany({
      select: {
        id: true,
        socialAccountId: true,
        dayOfWeek: true,
        hourOfDay: true,
        score: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });
    
    console.log(`📊 Found ${existingHotspots.length} existing hotspots (showing latest 5):`);
    existingHotspots.forEach((hotspot, index) => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      console.log(`   ${index + 1}. Account: ${hotspot.socialAccountId}`);
      console.log(`      Time: ${days[hotspot.dayOfWeek]} ${hotspot.hourOfDay}:00`);
      console.log(`      Score: ${hotspot.score}`);
      console.log(`      Updated: ${hotspot.updatedAt.toISOString()}`);
    });
    console.log('');
    
    // Step 3: Check post analytics data
    console.log('3️⃣ Checking post analytics data...');
    const postAnalytics = await prisma.postAnalytics.findMany({
      select: {
        id: true,
        postSocialAccountId: true,
        engagement: true,
        recordedAt: true,
        postSocialAccount: {
          select: {
            socialAccountId: true,
            socialAccount: {
              select: {
                name: true,
                platform: true,
              },
            },
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: 5,
    });
    
    console.log(`📊 Found ${postAnalytics.length} post analytics records (showing latest 5):`);
    postAnalytics.forEach((analytics, index) => {
      console.log(`   ${index + 1}. Account: ${analytics.postSocialAccount.socialAccount.name} (${analytics.postSocialAccount.socialAccount.platform})`);
      console.log(`      Engagement: ${analytics.engagement}`);
      console.log(`      Recorded: ${analytics.recordedAt.toISOString()}`);
    });
    console.log('');
    
    // Step 4: Test single account analysis
    if (socialAccounts.length > 0) {
      const testAccount = socialAccounts[0];
      console.log(`4️⃣ Testing single account analysis for: ${testAccount.name} (${testAccount.id})`);
      
      try {
        // Import the SchedulerService
        const { SchedulerService } = await import('../src/lib/services/scheduler.service.js');
        
        console.log('   Starting analysis...');
        const startTime = Date.now();
        
        await SchedulerService.analyzeAndStoreHotspots(testAccount.id);
        
        const endTime = Date.now();
        console.log(`   ✅ Analysis completed in ${endTime - startTime}ms`);
        
        // Check if new hotspots were created
        const newHotspots = await prisma.engagementHotspot.findMany({
          where: { socialAccountId: testAccount.id },
          orderBy: { updatedAt: 'desc' },
          take: 3,
        });
        
        console.log(`   📊 Found ${newHotspots.length} hotspots for this account (showing latest 3):`);
        newHotspots.forEach((hotspot, index) => {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          console.log(`      ${index + 1}. ${days[hotspot.dayOfWeek]} ${hotspot.hourOfDay}:00 - Score: ${hotspot.score}`);
        });
        
      } catch (error) {
        console.error('   ❌ Single account analysis failed:', error.message);
        console.error('   Stack trace:', error.stack);
      }
    }
    
    // Step 5: Test full batch analysis
    console.log('\n5️⃣ Testing full batch analysis...');
    try {
      const { SchedulerService } = await import('../src/lib/services/scheduler.service.js');
      
      console.log('   Starting batch analysis...');
      const startTime = Date.now();
      
      const result = await SchedulerService.runHotspotAnalysisForAllAccounts();
      
      const endTime = Date.now();
      console.log(`   ✅ Batch analysis completed in ${endTime - startTime}ms`);
      console.log(`   📊 Results:`, result);
      
    } catch (error) {
      console.error('   ❌ Batch analysis failed:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    
  } catch (error) {
    console.error('💥 Debug script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugHotspotAnalysis().catch(console.error); 