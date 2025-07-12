import OpenAI from "openai";
import { InsightSummary } from "../insight-processor";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function generateNarrativeWithAI(
  summary: InsightSummary
): Promise<string> {
  const prompt = `
Buatlah narasi profesional berbasis data untuk laporan social media berikut.

Data:
- Total impresi: ${summary.totalImpressions}
- Total reach: ${summary.totalReach}
- Total clicks: ${summary.totalClicks}
- Total paid impressions: ${summary.totalPaid}
- Total organic impressions: ${summary.totalOrganic}
- Engagement rate per platform: ${JSON.stringify(summary.engagementRates)}
- CTR per platform: ${JSON.stringify(summary.ctrs)}
- Top platform by engagement: ${summary.topPlatformByEngagement}
- Top platform by reach: ${summary.topPlatformByReach}

Gunakan gaya bahasa profesional, ringkas, dan to the point.
Tampilkan insight menarik, anomali, dan saran jika ada.
`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4",
      temperature: 0.7,
    });

    return (
      completion.choices[0].message.content || "Failed to generate narrative"
    );
  } catch (error) {
    console.error("Error generating AI narrative:", error);
    return "Failed to generate AI narrative. Using default summary.";
  }
}
