#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestScheduledPost() {
  console.log('🧪 Membuat Test Post Terjadwal...\n');

  try {
    // 1. Cari user pertama
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ Tidak ada user ditemukan. Buat user terlebih dahulu.');
      return;
    }

    // 2. Cari team user melalui membership
    const membership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
      },
      include: {
        team: true,
      },
    });

    if (!membership) {
      console.log('❌ User tidak memiliki membership di team manapun.');
      return;
    }

    const team = membership.team;

    if (!team) {
      console.log('❌ Tidak ada team ditemukan untuk user.');
      return;
    }

    // 3. Cari social account
    const socialAccount = await prisma.socialAccount.findFirst({
      where: {
        teamId: team.id,
      },
    });

    if (!socialAccount) {
      console.log('❌ Tidak ada social account ditemukan. Buat social account terlebih dahulu.');
      return;
    }

    // 4. Buat post yang dijadwalkan 2 menit dari sekarang
    const scheduledAt = new Date(Date.now() + 2 * 60 * 1000); // 2 menit dari sekarang
    
    const post = await prisma.post.create({
      data: {
        content: `🧪 Test Post Scheduler - ${new Date().toISOString()}

Ini adalah post test untuk memverifikasi bahwa scheduler berjalan dengan benar.
Post ini dijadwalkan untuk dipublish pada: ${scheduledAt.toISOString()}

#TestScheduler #AutoPost #CronJob`,
        mediaUrls: [],
        scheduledAt: scheduledAt,
        platform: 'ALL',
        status: 'SCHEDULED',
        userId: user.id,
        teamId: team.id,
        postSocialAccounts: {
          create: [
            {
              socialAccountId: socialAccount.id,
              status: 'SCHEDULED',
            },
          ],
        },
      },
      include: {
        postSocialAccounts: {
          include: {
            socialAccount: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    console.log('✅ Test post berhasil dibuat!');
    console.log(`📝 Post ID: ${post.id}`);
    console.log(`👤 Author: ${post.user.name}`);
    console.log(`📅 Dijadwalkan: ${post.scheduledAt.toISOString()}`);
    console.log(`🔗 Platform: ${post.postSocialAccounts.map(psa => psa.socialAccount.platform).join(', ')}`);
    console.log(`📄 Content: ${post.content.substring(0, 100)}...`);

    const minutesUntilPublish = Math.ceil((post.scheduledAt - new Date()) / (1000 * 60));
    console.log(`\n⏰ Post akan dipublish dalam ${minutesUntilPublish} menit`);

    console.log('\n🔍 Untuk memantau proses publishing:');
    console.log('1. Tunggu 2 menit');
    console.log('2. Jalankan: npm run check-scheduled-posts');
    console.log('3. Atau monitor real-time: npm run test-job-monitoring');

    console.log('\n📊 Status cron job saat ini:');
    console.log('curl "http://localhost:3001/api/cron-manager?action=status&apiKey=test-scheduler-key"');

  } catch (error) {
    console.error('❌ Error saat membuat test post:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan pembuatan test post
createTestScheduledPost(); 