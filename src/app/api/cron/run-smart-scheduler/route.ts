import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { analyzeAndStoreHotspots } from "@/lib/services/analytics/smartSchedulerService";

// Secret key for securing the cron endpoint
const CRON_SECRET = process.env.CRON_SECRET;

// Initialize Prisma client
const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Verify the secret key
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (!CRON_SECRET || secret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active social accounts
    const socialAccounts = await prisma.socialAccount.findMany({
      select: {
        id: true,
        name: true,
        platform: true,
      },
    });

    // Run analysis for each account
    const results = await Promise.allSettled(
      socialAccounts.map(async (account) => {
        try {
          await analyzeAndStoreHotspots(account.id);
          return {
            accountId: account.id,
            name: account.name,
            platform: account.platform,
            status: "success",
          };
        } catch (error) {
          return {
            accountId: account.id,
            name: account.name,
            platform: account.platform,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    // Log the results
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.filter((r) => r.status === "rejected").length;

    // Create a summary of the results
    const summary = {
      totalAccounts: socialAccounts.length,
      successfulAnalyses: successCount,
      failedAnalyses: failureCount,
      details: results.map((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            status: "error",
            error:
              result.reason instanceof Error
                ? result.reason.message
                : "Unknown error",
          };
        }
      }),
    };

    // Store the execution record
    await prisma.cronLog.create({
      data: {
        name: "smart-scheduler-analysis",
        status: failureCount === 0 ? "success" : "partial",
        message: JSON.stringify(summary),
      },
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error running smart scheduler analysis:", error);

    // Log the error
    await prisma.cronLog.create({
      data: {
        name: "smart-scheduler-analysis",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
