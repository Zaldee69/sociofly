#!/usr/bin/env ts-node

/**
 * Redis Job Performance Monitor
 *
 * Monitor Redis-based job performance and provide optimization recommendations
 * Usage: npx tsx scripts/monitor-redis-performance.ts
 */

import { prisma } from "../src/lib/prisma/client";

interface JobPerformanceMetrics {
  jobName: string;
  totalRuns: number;
  successRate: number;
  averageExecutionTime: number;
  lastRun: Date | null;
  recentErrors: string[];
  performance: "excellent" | "good" | "poor" | "critical";
}

async function analyzeJobPerformance() {
  console.log("📊 Redis Job Performance Analysis\n");

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
      console.log("ℹ️  No job logs found in the last 24 hours");
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

    const metrics: JobPerformanceMetrics[] = [];

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
      let performance: JobPerformanceMetrics["performance"] = "excellent";
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
    console.log("🏥 REDIS JOB SYSTEM HEALTH");
    console.log("─".repeat(80));
    console.log(`Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
    console.log(`Average Execution Time: ${avgExecutionTime.toFixed(0)}ms`);

    // Check Redis status
    await checkRedisStatus();

    // Recommendations
    console.log("\n💡 OPTIMIZATION RECOMMENDATIONS:");
    console.log("─".repeat(80));

    const publishMetric = metrics.find((m) => m.jobName.includes("publish"));
    if (publishMetric) {
      if (publishMetric.averageExecutionTime > 10000) {
        console.log("🔧 PUBLISH JOB OPTIMIZATION:");
        console.log("   • Consider reducing batch size in Redis jobs");
        console.log("   • Check Redis memory usage and optimization");
        console.log("   • Optimize database queries in job processors");
      }

      if (publishMetric.totalRuns > 100) {
        console.log("⚡ HIGH FREQUENCY PUBLISHING:");
        console.log("   • Current: Redis BullMQ handles scheduling");
        console.log("   • Consider Redis clustering for high volume");
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

    // Redis-specific recommendations
    console.log("\n⚙️  REDIS CONFIGURATION:");
    console.log("   # Redis optimization for job performance:");
    console.log("   redis-cli config set maxmemory-policy allkeys-lru");
    console.log("   redis-cli config set timeout 300");
    console.log("   # Monitor Redis memory:");
    console.log("   redis-cli info memory");
  } catch (error) {
    console.error("❌ Error analyzing job performance:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkRedisStatus() {
  try {
    const response = await fetch(
      "http://localhost:3000/api/cron-manager?action=status&apiKey=test-scheduler-key"
    );
    const data = await response.json();

    if (data.success) {
      const status = data.result;
      console.log("\n🗄️  REDIS STATUS:");
      console.log(`   Connected: ${status.redisAvailable ? "✅" : "❌"}`);
      console.log(
        `   Queue Manager: ${status.queueManagerReady ? "✅" : "❌"}`
      );
      console.log(
        `   Jobs Running: ${status.cronJobs?.filter((j: any) => j.running).length || 0}/7`
      );

      if (status.redisInfo) {
        console.log(
          `   Host: ${status.redisInfo.host}:${status.redisInfo.port}`
        );
        console.log(
          `   Cluster Mode: ${status.redisInfo.isCluster ? "Yes" : "No"}`
        );
      }

      if (status.queueMetrics) {
        console.log("\n📊 QUEUE METRICS:");
        Object.entries(status.queueMetrics).forEach(
          ([queueName, metrics]: [string, any]) => {
            console.log(
              `   ${queueName}: ${metrics.waiting} waiting, ${metrics.active} active, ${metrics.completed} completed, ${metrics.failed} failed`
            );
          }
        );
      }
    }
  } catch (error) {
    console.log("⚠️  Could not fetch Redis status from API");
  }
}

// Run the analysis
if (require.main === module) {
  analyzeJobPerformance()
    .then(() => {
      console.log("\n✅ Analysis complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Analysis failed:", error);
      process.exit(1);
    });
}
