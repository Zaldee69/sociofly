#!/usr/bin/env tsx

/**
 * Duplicate Post Monitor
 *
 * This script monitors for duplicate posts on Instagram and provides
 * diagnostics to help identify the root cause of duplication issues.
 */

import { PrismaClient, PostStatus } from "@prisma/client";

const prisma = new PrismaClient();

interface DuplicateAnalysis {
  postId: string;
  content: string;
  scheduledAt: Date;
  duplicates: Array<{
    socialAccountId: string;
    platform: string;
    platformPostId: string | null;
    publishedAt: Date | null;
    status: PostStatus;
  }>;
  possibleCauses: string[];
}

async function detectDuplicatePosts(): Promise<DuplicateAnalysis[]> {
  console.log("🔍 Scanning for duplicate posts...");

  // Find posts that have multiple published entries to the same social account
  const suspiciousPosts = await prisma.post.findMany({
    where: {
      postSocialAccounts: {
        some: {
          status: PostStatus.PUBLISHED,
        },
      },
    },
    include: {
      postSocialAccounts: {
        include: {
          socialAccount: {
            select: {
              platform: true,
              profileId: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100, // Check last 100 posts
  });

  const duplicates: DuplicateAnalysis[] = [];

  for (const post of suspiciousPosts) {
    // Group by social account to detect duplicates
    const accountGroups = new Map<string, typeof post.postSocialAccounts>();

    for (const psa of post.postSocialAccounts) {
      const key = psa.socialAccountId;
      if (!accountGroups.has(key)) {
        accountGroups.set(key, []);
      }
      accountGroups.get(key)!.push(psa);
    }

    // Check for accounts with multiple entries
    for (const [accountId, entries] of accountGroups.entries()) {
      if (entries.length > 1) {
        const publishedEntries = entries.filter(
          (e) => e.status === PostStatus.PUBLISHED
        );

        if (publishedEntries.length > 1) {
          const possibleCauses = [];

          // Analyze timing
          const publishTimes = publishedEntries
            .map((e) => e.publishedAt)
            .filter((t) => t !== null)
            .sort();

          if (publishTimes.length > 1) {
            const timeDiff =
              publishTimes[1]!.getTime() - publishTimes[0]!.getTime();
            const minutesDiff = Math.round(timeDiff / (1000 * 60));

            if (minutesDiff < 5) {
              possibleCauses.push(
                `Multiple publications within ${minutesDiff} minutes - likely race condition`
              );
            } else if (minutesDiff <= 60) {
              possibleCauses.push(
                `Publications ${minutesDiff} minutes apart - possible cron job overlap`
              );
            } else {
              possibleCauses.push(
                `Publications ${Math.round(minutesDiff / 60)} hours apart - manual republication?`
              );
            }
          }

          // Check for identical platform post IDs (actual Instagram duplicates)
          const platformPostIds = publishedEntries
            .map((e) => e.platformPostId)
            .filter((id) => id !== null);

          if (platformPostIds.length !== new Set(platformPostIds).size) {
            possibleCauses.push(
              "Identical platform post IDs - database inconsistency"
            );
          }

          duplicates.push({
            postId: post.id,
            content:
              post.content.substring(0, 100) +
              (post.content.length > 100 ? "..." : ""),
            scheduledAt: post.scheduledAt,
            duplicates: publishedEntries.map((entry) => ({
              socialAccountId: entry.socialAccountId,
              platform: entry.socialAccount?.platform || "Unknown",
              platformPostId: entry.platformPostId,
              publishedAt: entry.publishedAt,
              status: entry.status,
            })),
            possibleCauses,
          });
        }
      }
    }
  }

  return duplicates;
}

async function generateDuplicateReport(): Promise<void> {
  try {
    console.log("📊 Generating Duplicate Post Report");
    console.log("=" + "=".repeat(50));

    const duplicates = await detectDuplicatePosts();

    if (duplicates.length === 0) {
      console.log("✅ No duplicate posts detected!");
      return;
    }

    console.log(
      `🚨 Found ${duplicates.length} posts with potential duplicates:`
    );
    console.log();

    for (const duplicate of duplicates) {
      console.log(`Post ID: ${duplicate.postId}`);
      console.log(`Content: ${duplicate.content}`);
      console.log(`Scheduled: ${duplicate.scheduledAt.toISOString()}`);
      console.log(`Duplicates found: ${duplicate.duplicates.length}`);
      console.log();

      for (const dup of duplicate.duplicates) {
        console.log(`  - Platform: ${dup.platform}`);
        console.log(`    Account ID: ${dup.socialAccountId}`);
        console.log(`    Platform Post ID: ${dup.platformPostId || "N/A"}`);
        console.log(
          `    Published: ${dup.publishedAt?.toISOString() || "N/A"}`
        );
        console.log(`    Status: ${dup.status}`);
        console.log();
      }

      console.log("Possible causes:");
      for (const cause of duplicate.possibleCauses) {
        console.log(`  • ${cause}`);
      }
      console.log("-".repeat(60));
    }

    // Generate summary statistics
    const totalDuplicates = duplicates.reduce(
      (sum, d) => sum + d.duplicates.length,
      0
    );
    const platformStats = new Map<string, number>();

    for (const duplicate of duplicates) {
      for (const dup of duplicate.duplicates) {
        platformStats.set(
          dup.platform,
          (platformStats.get(dup.platform) || 0) + 1
        );
      }
    }

    console.log("\n📈 Summary Statistics:");
    console.log(`Total posts with duplicates: ${duplicates.length}`);
    console.log(`Total duplicate entries: ${totalDuplicates}`);
    console.log("\nBy platform:");
    for (const [platform, count] of platformStats.entries()) {
      console.log(`  ${platform}: ${count} duplicates`);
    }
  } catch (error) {
    console.error("❌ Error generating duplicate report:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupDuplicatePosts(dryRun: boolean = true): Promise<void> {
  console.log(`🧹 ${dryRun ? "DRY RUN - " : ""}Cleaning up duplicate posts...`);

  const duplicates = await detectDuplicatePosts();
  let cleanupCount = 0;

  for (const duplicate of duplicates) {
    // For each duplicate, keep the first published entry and remove others
    const sortedDuplicates = duplicate.duplicates.sort((a, b) => {
      if (a.publishedAt && b.publishedAt) {
        return a.publishedAt.getTime() - b.publishedAt.getTime();
      }
      return 0;
    });

    // Keep the first one, mark others as cleanup candidates
    for (let i = 1; i < sortedDuplicates.length; i++) {
      const duplicateEntry = sortedDuplicates[i];

      console.log(
        `${dryRun ? "[DRY RUN] " : ""}Would cleanup: Post ${duplicate.postId} -> Account ${duplicateEntry.socialAccountId}`
      );

      if (!dryRun) {
        // In a real cleanup, we would:
        // 1. Delete the duplicate entry from PostSocialAccount
        // 2. Optionally try to delete the actual Instagram post
        // 3. Log the cleanup action

        try {
          await prisma.postSocialAccount.delete({
            where: {
              postId_socialAccountId: {
                postId: duplicate.postId,
                socialAccountId: duplicateEntry.socialAccountId,
              },
            },
          });
          cleanupCount++;
          console.log(
            `✅ Cleaned up duplicate entry for post ${duplicate.postId}`
          );
        } catch (error) {
          console.error(`❌ Failed to cleanup duplicate entry:`, error);
        }
      }
    }
  }

  console.log(
    `${dryRun ? "[DRY RUN] " : ""}Cleanup complete. ${cleanupCount} duplicates ${dryRun ? "would be" : "were"} removed.`
  );
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "report";

  switch (command) {
    case "report":
      await generateDuplicateReport();
      break;

    case "cleanup":
      const dryRun = !args.includes("--confirm");
      await cleanupDuplicatePosts(dryRun);
      break;

    default:
      console.log("Usage:");
      console.log("  tsx scripts/debug/duplicate-post-monitor.ts report");
      console.log(
        "  tsx scripts/debug/duplicate-post-monitor.ts cleanup [--confirm]"
      );
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}
