import { generateNarrativeWithAI } from "./services/ai-narrative-generator";

/**
 * Types for social media platform insights data
 */
export type PlatformEntry = {
  platform: string;
  socialAccountName: string;
  overview: {
    impressions: number;
    reach: number;
    engagement: number;
    clicks: number;
  };
  richInsights: {
    impressionsPaid: number;
    impressionsOrganic: number;
  };
};

export type InsightSummary = {
  totalImpressions: number;
  totalReach: number;
  totalEngagement: number;
  totalClicks: number;
  totalPaid: number;
  totalOrganic: number;
  topPlatformByEngagement: string;
  topPlatformByReach: string;
  engagementRates: Record<string, number>;
  ctrs: Record<string, number>;
  narrative: string;
};

/**
 * Processes social media insights data and generates a comprehensive summary
 * @param data Raw insights data containing an array of platform entries
 * @param useAI Optional flag to use AI for narrative generation
 * @returns Processed InsightSummary with metrics and auto-generated narrative
 */
export async function processInsights(
  data: { platforms: PlatformEntry[] },
  useAI: boolean = false
): Promise<InsightSummary> {
  const summary = {
    totalImpressions: 0,
    totalReach: 0,
    totalEngagement: 0,
    totalClicks: 0,
    totalPaid: 0,
    totalOrganic: 0,
    topPlatformByEngagement: "",
    topPlatformByReach: "",
    engagementRates: {} as Record<string, number>,
    ctrs: {} as Record<string, number>,
    narrative: "",
  };

  let maxEngagement = 0;
  let maxReach = 0;

  for (const platform of data.platforms) {
    const {
      platform: platformName,
      socialAccountName,
      overview,
      richInsights,
    } = platform;

    const key = `${platformName} (${socialAccountName})`;

    // Accumulate totals
    summary.totalImpressions += overview.impressions;
    summary.totalReach += overview.reach;
    summary.totalEngagement += overview.engagement;
    summary.totalClicks += overview.clicks;
    summary.totalPaid += richInsights.impressionsPaid;
    summary.totalOrganic += richInsights.impressionsOrganic;

    // Calculate rates
    const engagementRate = (overview.engagement / overview.reach) * 100;
    const ctr = (overview.clicks / overview.impressions) * 100;

    summary.engagementRates[key] = Number(engagementRate.toFixed(2));
    summary.ctrs[key] = Number(ctr.toFixed(2));

    // Track top performing platforms
    if (overview.engagement > maxEngagement) {
      summary.topPlatformByEngagement = key;
      maxEngagement = overview.engagement;
    }

    if (overview.reach > maxReach) {
      summary.topPlatformByReach = key;
      maxReach = overview.reach;
    }
  }

  // Generate narrative
  if (useAI) {
    try {
      summary.narrative = await generateNarrativeWithAI(summary);
    } catch (error) {
      console.error(
        "Failed to generate AI narrative, falling back to default:",
        error
      );
      summary.narrative = generateDefaultNarrative(summary);
    }
  } else {
    summary.narrative = generateDefaultNarrative(summary);
  }

  return summary;
}

function generateDefaultNarrative(summary: InsightSummary): string {
  return `
Postingan ini telah dipublikasikan di beberapa akun media sosial dengan total impresi ${summary.totalImpressions.toLocaleString()} dan jangkauan ${summary.totalReach.toLocaleString()} pengguna.

Platform dengan performa tertinggi berdasarkan **engagement** adalah *${summary.topPlatformByEngagement}* dengan engagement rate ${summary.engagementRates[summary.topPlatformByEngagement]}%. 
Sementara itu, platform dengan jangkauan terluas adalah *${summary.topPlatformByReach}*.

Distribusi impresi menunjukkan bahwa sekitar ${((summary.totalPaid / summary.totalImpressions) * 100).toFixed(2)}% berasal dari iklan berbayar, dan ${((summary.totalOrganic / summary.totalImpressions) * 100).toFixed(2)}% berasal dari organik.

Rata-rata Click-Through Rate (CTR) per platform:
${Object.entries(summary.ctrs)
  .map(([k, v]) => `- ${k}: ${v}%`)
  .join("\n")}
`.trim();
}
