#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkScheduledPosts() {
  console.log('🔍 Menganalisis Post Terjadwal...\n');

  try {
    const now = new Date();
    console.log(`⏰ Waktu sekarang: ${now.toISOString()}\n`);

    // 1. Cek total post terjadwal
    const totalScheduled = await prisma.post.count({
      where: {
        status: 'SCHEDULED',
      },
    });

    console.log(`📊 Total post dengan status SCHEDULED: ${totalScheduled}`);

    // 2. Cek post yang sudah due (seharusnya dipublish)
    const duePosts = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        postSocialAccounts: {
          include: {
            socialAccount: true,
          },
        },
        approvalInstances: {
          select: {
            status: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    console.log(`🚨 Post yang sudah due untuk dipublish: ${duePosts.length}\n`);

    if (duePosts.length > 0) {
      console.log('📋 Detail post yang due:');
      duePosts.forEach((post, index) => {
        const minutesOverdue = Math.floor((now - post.scheduledAt) / (1000 * 60));
        const hasApproval = post.approvalInstances.length > 0;
        const isApproved = post.approvalInstances.some(instance => instance.status === 'APPROVED');
        
        console.log(`\n${index + 1}. Post ID: ${post.id}`);
        console.log(`   📅 Dijadwalkan: ${post.scheduledAt.toISOString()}`);
        console.log(`   ⏱️  Terlambat: ${minutesOverdue} menit`);
        console.log(`   👤 Author: ${post.user?.name || 'Unknown'}`);
        console.log(`   📝 Content: ${post.content.substring(0, 100)}...`);
        console.log(`   🔗 Platform: ${post.postSocialAccounts.map(psa => psa.socialAccount?.platform).join(', ')}`);
        console.log(`   ✅ Approval: ${hasApproval ? (isApproved ? 'APPROVED' : 'PENDING') : 'NOT_REQUIRED'}`);
      });
    }

    // 3. Cek post yang akan datang (dalam 24 jam)
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcomingPosts = await prisma.post.count({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          gt: now,
          lte: tomorrow,
        },
      },
    });

    console.log(`\n📅 Post terjadwal dalam 24 jam ke depan: ${upcomingPosts}`);

    // 4. Cek post dengan approval pending
    const pendingApprovalPosts = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        approvalInstances: {
          some: {
            status: 'PENDING',
          },
        },
      },
      include: {
        approvalInstances: {
          where: {
            status: 'PENDING',
          },
        },
      },
    });

    console.log(`\n⏳ Post dengan approval pending: ${pendingApprovalPosts.length}`);

    // 5. Cek log cron job terbaru
    const recentCronLogs = await prisma.cronLog.findMany({
      where: {
        name: {
          contains: 'publish_due_posts',
        },
      },
      orderBy: {
        executedAt: 'desc',
      },
      take: 5,
    });

    console.log(`\n📜 Log cron job publish_due_posts terbaru:`);
    if (recentCronLogs.length === 0) {
      console.log('   ❌ Tidak ada log cron job ditemukan!');
      console.log('   🔧 Kemungkinan masalah: Cron job belum pernah dijalankan');
    } else {
      recentCronLogs.forEach((log, index) => {
        console.log(`\n${index + 1}. ${log.executedAt.toISOString()}`);
        console.log(`   Status: ${log.status}`);
        console.log(`   Message: ${log.message}`);
      });
    }

    // 6. Analisis masalah
    console.log('\n🔍 ANALISIS MASALAH:');
    
    if (duePosts.length > 0 && recentCronLogs.length === 0) {
      console.log('❌ MASALAH UTAMA: Cron job publish_due_posts tidak berjalan sama sekali');
      console.log('🔧 SOLUSI:');
      console.log('   1. Pastikan Redis berjalan: redis-server');
      console.log('   2. Inisialisasi cron manager: npm run jobs:init');
      console.log('   3. Trigger manual: npm run jobs:trigger');
    } else if (duePosts.length > 0 && recentCronLogs.length > 0) {
      const lastLog = recentCronLogs[0];
      const minutesSinceLastRun = Math.floor((now - lastLog.executedAt) / (1000 * 60));
      
      if (minutesSinceLastRun > 5) {
        console.log(`❌ MASALAH: Cron job terakhir berjalan ${minutesSinceLastRun} menit yang lalu`);
        console.log('🔧 SOLUSI: Cron job mungkin berhenti, restart sistem');
      } else if (lastLog.status === 'ERROR') {
        console.log('❌ MASALAH: Cron job mengalami error');
        console.log(`🔧 ERROR: ${lastLog.message}`);
      } else {
        console.log('❓ MASALAH: Cron job berjalan tapi post tidak terpublish');
        console.log('🔧 SOLUSI: Periksa approval workflow atau konfigurasi social account');
      }
    } else if (duePosts.length === 0) {
      console.log('✅ TIDAK ADA MASALAH: Tidak ada post yang due untuk dipublish');
    }

    // 7. Rekomendasi tindakan
    console.log('\n🚀 REKOMENDASI TINDAKAN:');
    if (duePosts.length > 0) {
      console.log('1. Trigger manual publish_due_posts:');
      console.log('   curl -X POST "http://localhost:3001/api/cron-manager" \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d \'{"action": "trigger", "jobName": "publish_due_posts", "apiKey": "test-scheduler-key"}\'');
      
      console.log('\n2. Monitor job execution:');
      console.log('   npm run test-job-monitoring');
      
      console.log('\n3. Periksa status cron manager:');
      console.log('   curl "http://localhost:3001/api/cron-manager?action=status&apiKey=test-scheduler-key"');
    }

  } catch (error) {
    console.error('❌ Error saat menganalisis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan analisis
checkScheduledPosts(); 