import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  AnalyticsReportPDF,
  ExecutiveReportPDF,
} from "@/components/analytics/pdf-templates";

// Mock data generator with comprehensive analytics data
const generateMockReportData = (template: string) => {
  const baseData = {
    title: "Social Media Analytics Report",
    subtitle: "Performance Analysis & Insights",
    dateRange: "December 1-31, 2024",
    includeLogo: true,

    // Basic sections data
    overview: {
      totalFollowers: 125430,
      totalPosts: 87,
      engagementRate: 4.8,
      topPlatform: "Instagram",
    },

    platformHighlights: [
      {
        platform: "Instagram",
        followers: 68420,
        posts: 45,
        engagementRate: 5.2,
        reach: 245800,
      },
      {
        platform: "Facebook",
        followers: 34210,
        posts: 28,
        engagementRate: 3.8,
        reach: 156400,
      },
      {
        platform: "LinkedIn",
        followers: 22800,
        posts: 14,
        engagementRate: 6.1,
        reach: 89600,
      },
    ],

    engagementBreakdown: [
      {
        metric: "Likes",
        instagram: 12450,
        facebook: 8230,
        linkedin: 3420,
      },
      {
        metric: "Comments",
        instagram: 1850,
        facebook: 920,
        linkedin: 580,
      },
      {
        metric: "Shares",
        instagram: 680,
        facebook: 1240,
        linkedin: 890,
      },
      {
        metric: "Saves",
        instagram: 2340,
        facebook: 450,
        linkedin: 230,
      },
    ],
  };

  // Add comprehensive sections for advanced templates (but not executive)
  if (template === "comprehensive") {
    return {
      ...baseData,

      audienceDemographics: {
        gender: { female: 58, male: 42 },
        ageRange: "25-34 years (45%)",
        topLocations: ["Jakarta", "Surabaya", "Bandung", "Medan", "Bali"],
      },

      contentPerformance: [
        {
          date: "2024-12-15",
          platform: "Instagram",
          format: "Video",
          reach: 45200,
          engagement: 2890,
        },
        {
          date: "2024-12-12",
          platform: "Facebook",
          format: "Image",
          reach: 32100,
          engagement: 1650,
        },
        {
          date: "2024-12-10",
          platform: "LinkedIn",
          format: "Article",
          reach: 18900,
          engagement: 1120,
        },
        {
          date: "2024-12-08",
          platform: "Instagram",
          format: "Carousel",
          reach: 38700,
          engagement: 2340,
        },
        {
          date: "2024-12-05",
          platform: "Facebook",
          format: "Video",
          reach: 41200,
          engagement: 1980,
        },
      ],

      hashtagAnalysis: [
        {
          hashtag: "#socialmedia",
          impressions: 125400,
          engagement: 8920,
        },
        {
          hashtag: "#digitalmarketing",
          impressions: 98200,
          engagement: 7340,
        },
        {
          hashtag: "#contentcreator",
          impressions: 76800,
          engagement: 5680,
        },
        {
          hashtag: "#marketing",
          impressions: 65400,
          engagement: 4890,
        },
        {
          hashtag: "#business",
          impressions: 54200,
          engagement: 3920,
        },
      ],

      postingSchedule: [
        {
          platform: "Instagram",
          bestTime: "7:00 PM - 9:00 PM",
          bestDay: "Wednesday",
        },
        {
          platform: "Facebook",
          bestTime: "1:00 PM - 3:00 PM",
          bestDay: "Tuesday",
        },
        {
          platform: "LinkedIn",
          bestTime: "8:00 AM - 10:00 AM",
          bestDay: "Thursday",
        },
      ],
    };
  }

  // Add executive-only sections
  if (template === "executive") {
    const comprehensiveData = {
      ...baseData,

      audienceDemographics: {
        gender: { female: 58, male: 42 },
        ageRange: "25-34 years (45%)",
        topLocations: ["Jakarta", "Surabaya", "Bandung", "Medan", "Bali"],
      },

      contentPerformance: [
        {
          date: "2024-12-15",
          platform: "Instagram",
          format: "Video",
          reach: 45200,
          engagement: 2890,
        },
        {
          date: "2024-12-12",
          platform: "Facebook",
          format: "Image",
          reach: 32100,
          engagement: 1650,
        },
        {
          date: "2024-12-10",
          platform: "LinkedIn",
          format: "Article",
          reach: 18900,
          engagement: 1120,
        },
        {
          date: "2024-12-08",
          platform: "Instagram",
          format: "Carousel",
          reach: 38700,
          engagement: 2340,
        },
        {
          date: "2024-12-05",
          platform: "Facebook",
          format: "Video",
          reach: 41200,
          engagement: 1980,
        },
      ],

      hashtagAnalysis: [
        {
          hashtag: "#socialmedia",
          impressions: 125400,
          engagement: 8920,
        },
        {
          hashtag: "#digitalmarketing",
          impressions: 98200,
          engagement: 7340,
        },
        {
          hashtag: "#contentcreator",
          impressions: 76800,
          engagement: 5680,
        },
        {
          hashtag: "#marketing",
          impressions: 65400,
          engagement: 4890,
        },
        {
          hashtag: "#business",
          impressions: 54200,
          engagement: 3920,
        },
      ],

      postingSchedule: [
        {
          platform: "Instagram",
          bestTime: "7:00 PM - 9:00 PM",
          bestDay: "Wednesday",
        },
        {
          platform: "Facebook",
          bestTime: "1:00 PM - 3:00 PM",
          bestDay: "Tuesday",
        },
        {
          platform: "LinkedIn",
          bestTime: "8:00 AM - 10:00 AM",
          bestDay: "Thursday",
        },
      ],
    };

    return {
      ...comprehensiveData,

      executiveSummary: {
        growthRate: 12.8,
        topContentType: "Video Content",
        topChannel: "Instagram",
        recommendation:
          "Focus on video content creation during peak engagement hours (7-9 PM) to maximize reach and engagement. Consider increasing LinkedIn presence for B2B audience growth.",
      },

      roiAnalysis: [
        {
          platform: "Instagram",
          adSpend: 2500000,
          leads: 145,
          cpl: 17241,
          conversionRate: 8.2,
        },
        {
          platform: "Facebook",
          adSpend: 1800000,
          leads: 98,
          cpl: 18367,
          conversionRate: 6.8,
        },
        {
          platform: "LinkedIn",
          adSpend: 3200000,
          leads: 67,
          cpl: 47761,
          conversionRate: 12.4,
        },
      ],

      competitiveAnalysis: [
        {
          competitor: "Your Brand",
          followers: 125430,
          engagementRate: 4.8,
          dominantContent: "Video",
          isOurBrand: true,
        },
        {
          competitor: "Competitor A",
          followers: 145200,
          engagementRate: 3.2,
          dominantContent: "Image",
        },
        {
          competitor: "Competitor B",
          followers: 98400,
          engagementRate: 5.1,
          dominantContent: "Carousel",
        },
        {
          competitor: "Competitor C",
          followers: 167800,
          engagementRate: 2.9,
          dominantContent: "Video",
        },
      ],
    };
  }

  return baseData;
};

export async function POST(request: NextRequest) {
  try {
    console.log("📊 PDF Generation API called");

    const body = await request.json();
    console.log("📋 Request body:", JSON.stringify(body, null, 2));

    const {
      template,
      customization = {},
      userPlan = "enterprise", // Default for testing
    } = body;

    // Extract values from customization object
    const {
      title = "Social Media Analytics Report",
      subtitle = "Performance Analysis & Insights",
      dateRange = "December 1-31, 2024",
      sections = [],
      includeLogo = true,
    } = customization;

    // Validate template parameter
    if (!template) {
      console.error("❌ Template parameter is required");
      return NextResponse.json(
        { error: "Template parameter is required" },
        { status: 400 }
      );
    }

    console.log(`🎨 Generating PDF for template: ${template}`);
    console.log(`👤 User plan: ${userPlan}`);
    console.log(`📑 Sections requested:`, sections);

    // Template access validation
    const templateAccess = {
      "basic-summary": ["free", "pro", "enterprise"],
      comprehensive: ["pro", "enterprise"],
      executive: ["enterprise"],
    };

    const templateKey = template as keyof typeof templateAccess;
    if (!templateAccess[templateKey]?.includes(userPlan)) {
      console.error(
        `🚫 Access denied for template ${template} with plan ${userPlan}`
      );
      return NextResponse.json(
        {
          error: "Access denied",
          message: `Template '${template}' requires a higher subscription plan`,
        },
        { status: 403 }
      );
    }

    // Generate comprehensive mock data
    const mockData = generateMockReportData(template);
    console.log("📊 Mock data generated successfully");

    // Determine sections based on template
    let templateSections: string[] = [];

    switch (template) {
      case "basic-summary":
        templateSections = [
          "overview",
          "platform-highlights",
          "engagement-breakdown",
        ];
        break;
      case "comprehensive":
        templateSections = [
          "overview",
          "platform-highlights",
          "engagement-breakdown",
          "audience-demographics",
          "content-performance",
          "hashtag-analysis",
          "posting-schedule",
        ];
        break;
      case "executive":
        templateSections = [
          "overview",
          "platform-highlights",
          "engagement-breakdown",
          "audience-demographics",
          "content-performance",
          "hashtag-analysis",
          "posting-schedule",
          "executive-summary",
          "roi-analysis",
          "competitive-analysis",
        ];
        break;
      default:
        templateSections = ["overview"];
    }

    const finalSections = sections.length > 0 ? sections : templateSections;
    console.log(`📋 Final sections to include:`, finalSections);

    // Create PDF props
    const pdfProps = {
      title,
      subtitle,
      dateRange,
      data: mockData,
      sections: finalSections,
      userPlan: userPlan as "free" | "pro" | "enterprise",
      includeLogo,
    };

    console.log("🔄 Starting PDF rendering...");

    // Generate PDF based on template
    let pdfBuffer: Buffer;

    if (template === "executive") {
      console.log("📈 Rendering Executive Report PDF");
      const pdfDocument = React.createElement(ExecutiveReportPDF, pdfProps);
      pdfBuffer = await renderToBuffer(pdfDocument);
    } else {
      console.log("📊 Rendering Analytics Report PDF");
      const pdfDocument = React.createElement(AnalyticsReportPDF, pdfProps);
      pdfBuffer = await renderToBuffer(pdfDocument);
    }

    console.log(
      `✅ PDF generated successfully. Size: ${pdfBuffer.length} bytes`
    );

    // Return PDF response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${template}-report-${Date.now()}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("❌ PDF generation failed:", error);

    // Enhanced error handling
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack =
      error instanceof Error ? error.stack : "No stack trace available";

    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Failed to generate PDF report",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
