#!/usr/bin/env ts-node

/**
 * Cron Performance Monitor
 *
 * Monitor cron job performance and provide optimization recommendations
 * Usage: npx tsx scripts/monitor-cron-performance.ts
 */

import { prisma } from "../src/lib/prisma/client";

interface CronPerformanceMetrics {
  jobName: string;
  totalRuns: number;
  successRate: number;
  averageExecutionTime: number;
  lastRun: Date | null;
  recentErrors: string[];
  performance: "excellent" | "good" | "poor" | "critical";
}

async function analyzeCronPerformance() {
  console.log("📊 Cron Job Performance Analysis\n");

  try {
    // Get performance data for the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const cronLogs = await prisma.cronLog.findMany({
      where: {
        executedAt: {
          gte: last24Hours,
        },
      },
      orderBy: {
        executedAt: "desc",
      },
    });

    if (cronLogs.length === 0) {
      console.log("ℹ️  No cron job logs found in the last 24 hours");
      return;
    }

    // Group logs by job name
    const jobGroups = cronLogs.reduce(
      (acc, log) => {
        if (!acc[log.name]) {
          acc[log.name] = [];
        }
        acc[log.name].push(log);
        return acc;
      },
      {} as Record<string, typeof cronLogs>
    );

    const metrics: CronPerformanceMetrics[] = [];

    // Analyze each job type
    for (const [jobName, logs] of Object.entries(jobGroups)) {
      const totalRuns = logs.length;
      const successfulRuns = logs.filter(
        (log) => log.status === "SUCCESS"
      ).length;
      const successRate = (successfulRuns / totalRuns) * 100;

      // Calculate average execution time from message when available
      const executionTimes = logs
        .map((log) => {
          if (!log.message) return null;
          const match = log.message.match(/(\d+)ms/);
          return match ? parseInt(match[1]) : null;
        })
        .filter((time): time is number => time !== null);

      const averageExecutionTime =
        executionTimes.length > 0
          ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
          : 0;

      const lastRun = logs[0]?.executedAt || null;
      const recentErrors = logs
        .filter((log) => log.status === "ERROR" || log.status === "FAILED")
        .slice(0, 3)
        .map((log) => log.message || "Unknown error")
        .filter((message): message is string => message !== null);

      // Determine performance rating
      let performance: CronPerformanceMetrics["performance"] = "excellent";
      if (successRate < 50) performance = "critical";
      else if (successRate < 80) performance = "poor";
      else if (successRate < 95) performance = "good";

      if (averageExecutionTime > 30000) {
        // Over 30 seconds
        performance = performance === "excellent" ? "good" : "poor";
      }

      metrics.push({
        jobName,
        totalRuns,
        successRate,
        averageExecutionTime,
        lastRun,
        recentErrors,
        performance,
      });
    }

    // Display results
    console.log("📈 Performance Summary (Last 24 Hours):");
    console.log("─".repeat(80));

    metrics.forEach((metric) => {
      const statusIcon = {
        excellent: "✅",
        good: "🟡",
        poor: "🟠",
        critical: "🔴",
      }[metric.performance];

      console.log(`\n${statusIcon} ${metric.jobName.toUpperCase()}`);
      console.log(`   Runs: ${metric.totalRuns}`);
      console.log(`   Success Rate: ${metric.successRate.toFixed(1)}%`);
      console.log(
        `   Avg Execution: ${metric.averageExecutionTime.toFixed(0)}ms`
      );
      console.log(
        `   Last Run: ${metric.lastRun?.toLocaleString() || "Never"}`
      );

      if (metric.recentErrors.length > 0) {
        console.log(`   Recent Errors:`);
        metric.recentErrors.forEach((error) => {
          console.log(`     • ${error.substring(0, 60)}...`);
        });
      }
    });

    // Overall system health
    const overallSuccessRate =
      metrics.reduce((acc, m) => acc + m.successRate, 0) / metrics.length;
    const avgExecutionTime =
      metrics.reduce((acc, m) => acc + m.averageExecutionTime, 0) /
      metrics.length;

    console.log("\n" + "─".repeat(80));
    console.log("🏥 SYSTEM HEALTH SUMMARY");
    console.log("─".repeat(80));
    console.log(`Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
    console.log(`Average Execution Time: ${avgExecutionTime.toFixed(0)}ms`);

    // Recommendations
    console.log("\n💡 OPTIMIZATION RECOMMENDATIONS:");
    console.log("─".repeat(80));

    const publishMetric = metrics.find((m) => m.jobName.includes("publish"));
    if (publishMetric) {
      if (publishMetric.averageExecutionTime > 10000) {
        console.log("🔧 PUBLISH OPTIMIZATION:");
        console.log("   • Reduce CRON_BATCH_SIZE (current default: 10)");
        console.log("   • Consider parallel processing optimization");
        console.log("   • Check database query performance");
      }

      if (publishMetric.totalRuns > 100) {
        console.log("⚡ HIGH FREQUENCY PUBLISHING:");
        console.log("   • Current: Every 1 minute (optimized)");
        console.log("   • Consider queue-based approach for high volume");
      }
    }

    // Performance warnings
    const criticalJobs = metrics.filter((m) => m.performance === "critical");
    if (criticalJobs.length > 0) {
      console.log("\n🚨 CRITICAL ISSUES:");
      criticalJobs.forEach((job) => {
        console.log(
          `   • ${job.jobName}: ${job.successRate.toFixed(1)}% success rate`
        );
      });
    }

    const slowJobs = metrics.filter((m) => m.averageExecutionTime > 15000);
    if (slowJobs.length > 0) {
      console.log("\n🐌 SLOW JOBS (>15s):");
      slowJobs.forEach((job) => {
        console.log(
          `   • ${job.jobName}: ${job.averageExecutionTime.toFixed(0)}ms average`
        );
      });
    }

    // Environment recommendations
    console.log("\n⚙️  ENVIRONMENT CONFIGURATION:");
    console.log("   # Add to your .env file for performance tuning:");
    console.log(
      "   CRON_BATCH_SIZE=5          # Reduce if system is overloaded"
    );
    console.log("   CRON_PUBLISH_ENABLED=true  # Disable to stop publishing");
    console.log(
      "   CRON_HEALTH_CHECK_ENABLED=false  # Disable non-critical checks"
    );

    // Recent batch performance
    const batchLogs = cronLogs.filter(
      (log) => log.name === "publish_due_posts_batch"
    );
    if (batchLogs.length > 0) {
      console.log("\n📦 BATCH PROCESSING ANALYSIS:");
      console.log("─".repeat(50));

      const recentBatches = batchLogs.slice(0, 10);
      let totalProcessed = 0;
      let totalSuccess = 0;
      let totalFailed = 0;

      recentBatches.forEach((log) => {
        if (log.message) {
          // Parse batch info from message: "Batch processed X posts: Y success, Z failed, A skipped"
          const processedMatch = log.message.match(/processed (\d+) posts/);
          const successMatch = log.message.match(/(\d+) success/);
          const failedMatch = log.message.match(/(\d+) failed/);

          if (processedMatch) totalProcessed += parseInt(processedMatch[1]);
          if (successMatch) totalSuccess += parseInt(successMatch[1]);
          if (failedMatch) totalFailed += parseInt(failedMatch[1]);
        }
      });

      if (totalProcessed > 0) {
        console.log(`Last 10 batches: ${totalProcessed} posts processed`);
        console.log(`Success: ${totalSuccess}, Failed: ${totalFailed}`);
        console.log(
          `Batch Success Rate: ${((totalSuccess / totalProcessed) * 100).toFixed(1)}%`
        );
      } else {
        console.log("No batch data available to analyze");
      }
    }
  } catch (error) {
    console.error("❌ Error analyzing cron performance:", error);
  }
}

// Check for high-load situations
async function checkSystemLoad() {
  console.log("\n🔍 SYSTEM LOAD CHECK:");
  console.log("─".repeat(40));

  try {
    // Check pending posts
    const pendingPosts = await prisma.post.count({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          lte: new Date(),
        },
      },
    });

    console.log(`Pending Posts: ${pendingPosts}`);

    if (pendingPosts > 100) {
      console.log("⚠️  HIGH LOAD: Consider increasing batch size or frequency");
    } else if (pendingPosts > 50) {
      console.log("🟡 MODERATE LOAD: Monitor performance");
    } else {
      console.log("✅ NORMAL LOAD: System operating efficiently");
    }

    // Check recent cron activity
    const recentActivity = await prisma.cronLog.count({
      where: {
        executedAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
    });

    console.log(
      `Recent Activity: ${recentActivity} cron executions in last 5 minutes`
    );

    if (recentActivity > 20) {
      console.log("⚠️  HIGH ACTIVITY: Cron jobs running frequently");
    }
  } catch (error) {
    console.error("❌ Error checking system load:", error);
  }
}

// Command line arguments
const args = process.argv.slice(2);

if (require.main === module) {
  analyzeCronPerformance()
    .then(() => checkSystemLoad())
    .catch(console.error);
}

export { analyzeCronPerformance, checkSystemLoad };
