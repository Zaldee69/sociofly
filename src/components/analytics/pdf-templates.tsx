import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Enhanced styles for better readability
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    paddingTop: 30,
    paddingLeft: 40,
    paddingRight: 40,
    paddingBottom: 40,
    backgroundColor: "#ffffff",
  },

  // Header styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#e5e7eb",
  },

  titleSection: {
    alignItems: "flex-end",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },

  dateRange: {
    fontSize: 10,
    color: "#9ca3af",
  },

  // Section styles
  section: {
    marginBottom: 25,
  },

  sectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },

  subsectionHeader: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },

  // Content styles
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    color: "#374151",
    marginBottom: 8,
  },

  bulletPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },

  bullet: {
    width: 6,
    height: 6,
    backgroundColor: "#2563eb",
    marginRight: 8,
    marginTop: 4,
  },

  bulletText: {
    fontSize: 11,
    color: "#374151",
    flex: 1,
    lineHeight: 1.5,
  },

  // Table styles
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  tableHeaderCell: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "center",
    flex: 1,
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  tableCell: {
    fontSize: 10,
    color: "#374151",
    textAlign: "center",
    flex: 1,
  },

  tableCellLeft: {
    fontSize: 10,
    color: "#374151",
    textAlign: "left",
    flex: 1,
  },

  // Metric cards
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },

  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 10,
    marginBottom: 10,
  },

  metricLabel: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "bold",
  },

  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },

  // Highlight boxes
  highlightBox: {
    backgroundColor: "#eff6ff",
    borderLeftWidth: 4,
    borderLeftColor: "#2563eb",
    padding: 16,
    marginBottom: 16,
  },

  recommendationBox: {
    backgroundColor: "#fef3c7",
    padding: 12,
    marginTop: 12,
  },

  recommendationTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#92400e",
    marginBottom: 4,
  },

  recommendationText: {
    fontSize: 10,
    color: "#78350f",
    lineHeight: 1.4,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },

  pageNumber: {
    position: "absolute",
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: "#9ca3af",
  },
});

// Helper function to format numbers
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("id-ID").format(num);
};

// Helper function to format currency
const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
};

interface ReportData {
  title: string;
  subtitle: string;
  dateRange: string;
  includeLogo: boolean;
  overview?: {
    totalFollowers: number;
    totalPosts: number;
    engagementRate: number;
    topPlatform: string;
  };
  platformHighlights?: Array<{
    platform: string;
    followers: number;
    posts: number;
    engagementRate: number;
    reach: number;
  }>;
  engagementBreakdown?: Array<{
    metric: string;
    instagram: number;
    facebook: number;
    linkedin: number;
  }>;
  audienceDemographics?: {
    gender: { female: number; male: number };
    ageRange: string;
    topLocations: string[];
  };
  contentPerformance?: Array<{
    date: string;
    platform: string;
    format: string;
    reach: number;
    engagement: number;
  }>;
  hashtagAnalysis?: Array<{
    hashtag: string;
    impressions: number;
    engagement: number;
  }>;
  postingSchedule?: Array<{
    platform: string;
    bestTime: string;
    bestDay: string;
  }>;
  executiveSummary?: {
    growthRate: number;
    topContentType: string;
    topChannel: string;
    recommendation: string;
  };
  roiAnalysis?: Array<{
    platform: string;
    adSpend: number;
    leads: number;
    cpl: number;
    conversionRate: number;
  }>;
  competitiveAnalysis?: Array<{
    competitor: string;
    followers: number;
    engagementRate: number;
    dominantContent: string;
    isOurBrand?: boolean;
  }>;
}

interface ReportProps {
  title: string;
  subtitle: string;
  dateRange: string;
  data: ReportData;
  sections: string[];
  userPlan: "free" | "pro" | "enterprise";
  brandColors?: {
    primary: string;
    secondary: string;
  };
  includeLogo?: boolean;
  logoUrl?: string;
}

// Utility functions
const formatPercentage = (num: number): string => {
  return num.toFixed(1) + "%";
};

// PDF Header Component
const PDFHeader: React.FC<{
  title: string;
  subtitle: string;
  dateRange: string;
  includeLogo?: boolean;
}> = ({ title, subtitle, dateRange }) => (
  <View style={styles.header}>
    <View style={styles.titleSection}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={styles.dateRange}>{dateRange}</Text>
    </View>
  </View>
);

// Basic Report Components
const OverviewSection: React.FC<{
  data: ReportData["overview"];
  sectionNumber: number;
}> = ({ data, sectionNumber }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>{sectionNumber}. Overview</Text>

    <View style={styles.metricsGrid}>
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Total Followers:</Text>
        <Text style={styles.metricValue}>
          {data && formatNumber(data.totalFollowers)}
        </Text>
      </View>

      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Total Posts:</Text>
        <Text style={styles.metricValue}>{data?.totalPosts}</Text>
      </View>

      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Engagement Rate:</Text>
        <Text style={styles.metricValue}>
          {data && formatPercentage(data.engagementRate)}
        </Text>
      </View>

      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>Top Platform:</Text>
        <Text style={styles.metricValue}>{data?.topPlatform}</Text>
      </View>
    </View>
  </View>
);

const PlatformHighlightsSection: React.FC<{
  data: ReportData["platformHighlights"];
  sectionNumber: number;
}> = ({ data, sectionNumber }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>
      {sectionNumber}. Platform Highlights
    </Text>

    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderCell}>Platform</Text>
        <Text style={styles.tableHeaderCell}>Followers</Text>
        <Text style={styles.tableHeaderCell}>Posts</Text>
        <Text style={styles.tableHeaderCell}>Engagement Rate</Text>
        <Text style={styles.tableHeaderCell}>Reach</Text>
      </View>

      {data?.map((platform: any, index: number) => (
        <View key={index} style={styles.tableRow}>
          <Text style={styles.tableCell}>{platform.platform}</Text>
          <Text style={styles.tableCell}>
            {formatNumber(platform.followers)}
          </Text>
          <Text style={styles.tableCell}>{platform.posts}</Text>
          <Text style={styles.tableCell}>
            {formatPercentage(platform.engagementRate)}
          </Text>
          <Text style={styles.tableCell}>{formatNumber(platform.reach)}</Text>
        </View>
      ))}
    </View>
  </View>
);

const EngagementBreakdownSection: React.FC<{
  data: ReportData["engagementBreakdown"];
  sectionNumber: number;
}> = ({ data, sectionNumber }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>
      {sectionNumber}. Engagement Breakdown
    </Text>

    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderCell}>Metric</Text>
        <Text style={styles.tableHeaderCell}>Instagram</Text>
        <Text style={styles.tableHeaderCell}>Facebook</Text>
        <Text style={styles.tableHeaderCell}>LinkedIn</Text>
      </View>

      {data?.map((platform: any, index: number) => (
        <View key={index} style={styles.tableRow}>
          <Text style={styles.tableCellLeft}>{platform.metric}</Text>
          <Text style={styles.tableCell}>{platform.instagram}</Text>
          <Text style={styles.tableCell}>{platform.facebook}</Text>
          <Text style={styles.tableCell}>{platform.linkedin}</Text>
        </View>
      ))}
    </View>
  </View>
);

// Comprehensive Report Components
const AudienceDemographicsSection: React.FC<{
  data: ReportData["audienceDemographics"];
  sectionNumber: number;
}> = ({ data, sectionNumber }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>
      {sectionNumber}. Audience Demographics
    </Text>

    <View style={styles.bulletPoint}>
      <View style={styles.bullet} />
      <Text style={styles.bulletText}>
        Gender:{" "}
        {data &&
          Object.entries(data.gender)
            .map(([gender, count]) => `${count}% ${gender}`)
            .join(", ")}
      </Text>
    </View>

    <View style={styles.bulletPoint}>
      <View style={styles.bullet} />
      <Text style={styles.bulletText}>Age Range: {data?.ageRange}</Text>
    </View>

    <View style={styles.bulletPoint}>
      <View style={styles.bullet} />
      <Text style={styles.bulletText}>
        Location: {data?.topLocations.slice(0, 3).join(", ")}
      </Text>
    </View>
  </View>
);

const ContentPerformanceSection: React.FC<{
  data: ReportData["contentPerformance"];
  sectionNumber: number;
}> = ({ data, sectionNumber }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>
      {sectionNumber}. Content Performance
    </Text>

    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderCell}>Date</Text>
        <Text style={styles.tableHeaderCell}>Platform</Text>
        <Text style={styles.tableHeaderCell}>Format</Text>
        <Text style={styles.tableHeaderCell}>Reach</Text>
        <Text style={styles.tableHeaderCell}>Engagement</Text>
      </View>

      {data?.slice(0, 5).map((post, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={styles.tableCell}>{post.date}</Text>
          <Text style={styles.tableCell}>{post.platform}</Text>
          <Text style={styles.tableCell}>{post.format}</Text>
          <Text style={styles.tableCell}>{formatNumber(post.reach)}</Text>
          <Text style={styles.tableCell}>{formatNumber(post.engagement)}</Text>
        </View>
      ))}
    </View>
  </View>
);

const HashtagAnalysisSection: React.FC<{
  data: ReportData["hashtagAnalysis"];
  sectionNumber: number;
}> = ({ data, sectionNumber }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>{sectionNumber}. Hashtag Analysis</Text>

    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderCell}>Hashtag</Text>
        <Text style={styles.tableHeaderCell}>Impressions</Text>
        <Text style={styles.tableHeaderCell}>Engagement</Text>
      </View>

      {data?.map((hashtag, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={styles.tableCell}>{hashtag.hashtag}</Text>
          <Text style={styles.tableCell}>
            {formatNumber(hashtag.impressions)}
          </Text>
          <Text style={styles.tableCell}>
            {formatNumber(hashtag.engagement)}
          </Text>
        </View>
      ))}
    </View>
  </View>
);

const PostingScheduleSection: React.FC<{
  data: ReportData["postingSchedule"];
  sectionNumber: number;
}> = ({ data, sectionNumber }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>
      {sectionNumber}. Posting Schedule Overview
    </Text>

    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderCell}>Platform</Text>
        <Text style={styles.tableHeaderCell}>Most Engaged Time</Text>
        <Text style={styles.tableHeaderCell}>Most Engaged Day</Text>
      </View>

      {data?.map((schedule, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={styles.tableCell}>{schedule.platform}</Text>
          <Text style={styles.tableCell}>{schedule.bestTime}</Text>
          <Text style={styles.tableCell}>{schedule.bestDay}</Text>
        </View>
      ))}
    </View>
  </View>
);

// Executive Report Components
const ExecutiveSummarySection: React.FC<{
  data: ReportData["executiveSummary"];
  sectionNumber: number;
}> = ({ data, sectionNumber }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>{sectionNumber}. Executive Summary</Text>

    <View style={styles.highlightBox}>
      <View style={styles.bulletPoint}>
        <View style={styles.bullet} />
        <Text style={styles.paragraph}>
          Monthly growth rate:{" "}
          {data && formatPercentage(Math.abs(data.growthRate))}
        </Text>
      </View>

      <View style={styles.bulletPoint}>
        <View style={styles.bullet} />
        <Text style={styles.paragraph}>
          Content type with highest ROI: {data?.topContentType}
        </Text>
      </View>

      <View style={styles.bulletPoint}>
        <View style={styles.bullet} />
        <Text style={styles.paragraph}>
          Channel with best engagement: {data?.topChannel}
        </Text>
      </View>

      <View style={styles.recommendationBox}>
        <Text style={styles.recommendationTitle}>
          Strategic Recommendation:
        </Text>
        <Text style={styles.recommendationText}>{data?.recommendation}</Text>
      </View>
    </View>
  </View>
);

const ROIAnalysisSection: React.FC<{
  data: ReportData["roiAnalysis"];
  sectionNumber: number;
}> = ({ data, sectionNumber }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>{sectionNumber}. ROI Analysis</Text>

    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderCell}>Platform</Text>
        <Text style={styles.tableHeaderCell}>Ad Spend</Text>
        <Text style={styles.tableHeaderCell}>Leads</Text>
        <Text style={styles.tableHeaderCell}>CPL</Text>
        <Text style={styles.tableHeaderCell}>Conversion Rate</Text>
      </View>

      {data?.map((roi, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={styles.tableCell}>{roi.platform}</Text>
          <Text style={styles.tableCell}>{formatCurrency(roi.adSpend)}</Text>
          <Text style={styles.tableCell}>{formatNumber(roi.leads)}</Text>
          <Text style={styles.tableCell}>{formatCurrency(roi.cpl)}</Text>
          <Text style={styles.tableCell}>
            {formatPercentage(roi.conversionRate)}
          </Text>
        </View>
      ))}
    </View>
  </View>
);

const CompetitiveAnalysisSection: React.FC<{
  data: ReportData["competitiveAnalysis"];
  sectionNumber: number;
}> = ({ data, sectionNumber }) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>
      {sectionNumber}. Competitive Analysis
    </Text>

    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderCell}>Competitor</Text>
        <Text style={styles.tableHeaderCell}>Followers</Text>
        <Text style={styles.tableHeaderCell}>Engagement Rate</Text>
        <Text style={styles.tableHeaderCell}>Dominant Content</Text>
      </View>

      {data?.map((competitor, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={styles.tableCell}>{competitor.competitor}</Text>
          <Text style={styles.tableCell}>
            {formatNumber(competitor.followers)}
          </Text>
          <Text style={styles.tableCell}>
            {formatPercentage(competitor.engagementRate)}
          </Text>
          <Text style={styles.tableCell}>{competitor.dominantContent}</Text>
        </View>
      ))}
    </View>
  </View>
);

const PDFFooter: React.FC<{
  userPlan: "free" | "pro" | "enterprise";
  pageNumber: number;
  totalPages: number;
}> = ({ userPlan, pageNumber, totalPages }) => (
  <View style={styles.footer}>
    <Text style={styles.footer}>
      *Note: Data is for illustrative purposes and should be replaced with
      actual platform insights.
    </Text>
    <Text style={styles.pageNumber}>
      Page {pageNumber} of {totalPages}
    </Text>
  </View>
);

// Main PDF Documents
export const AnalyticsReportPDF: React.FC<ReportProps> = ({
  title,
  subtitle,
  dateRange,
  data,
  sections,
  userPlan,
  includeLogo,
}) => {
  // Create dynamic section numbering based on included sections
  let currentSectionNumber = 1;
  const getSectionNumber = () => currentSectionNumber++;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          title={title}
          subtitle={subtitle}
          dateRange={dateRange}
          includeLogo={includeLogo}
        />

        {/* Basic sections */}
        {sections.includes("overview") && data.overview && (
          <OverviewSection
            data={data.overview}
            sectionNumber={getSectionNumber()}
          />
        )}

        {sections.includes("platform-highlights") &&
          data.platformHighlights && (
            <PlatformHighlightsSection
              data={data.platformHighlights}
              sectionNumber={getSectionNumber()}
            />
          )}

        {sections.includes("engagement-breakdown") &&
          data.engagementBreakdown && (
            <EngagementBreakdownSection
              data={data.engagementBreakdown}
              sectionNumber={getSectionNumber()}
            />
          )}

        {/* Comprehensive sections */}
        {sections.includes("audience-demographics") &&
          data.audienceDemographics && (
            <AudienceDemographicsSection
              data={data.audienceDemographics}
              sectionNumber={getSectionNumber()}
            />
          )}

        {sections.includes("content-performance") &&
          data.contentPerformance && (
            <ContentPerformanceSection
              data={data.contentPerformance}
              sectionNumber={getSectionNumber()}
            />
          )}

        {sections.includes("hashtag-analysis") && data.hashtagAnalysis && (
          <HashtagAnalysisSection
            data={data.hashtagAnalysis}
            sectionNumber={getSectionNumber()}
          />
        )}

        {sections.includes("posting-schedule") && data.postingSchedule && (
          <PostingScheduleSection
            data={data.postingSchedule}
            sectionNumber={getSectionNumber()}
          />
        )}

        {/* Executive sections (for AnalyticsReportPDF when included) */}
        {sections.includes("executive-summary") && data.executiveSummary && (
          <ExecutiveSummarySection
            data={data.executiveSummary}
            sectionNumber={getSectionNumber()}
          />
        )}

        {sections.includes("roi-analysis") && data.roiAnalysis && (
          <ROIAnalysisSection
            data={data.roiAnalysis}
            sectionNumber={getSectionNumber()}
          />
        )}

        {sections.includes("competitive-analysis") &&
          data.competitiveAnalysis && (
            <CompetitiveAnalysisSection
              data={data.competitiveAnalysis}
              sectionNumber={getSectionNumber()}
            />
          )}

        <PDFFooter userPlan={userPlan} pageNumber={1} totalPages={1} />
      </Page>
    </Document>
  );
};

export const ExecutiveReportPDF: React.FC<ReportProps> = ({
  title,
  subtitle,
  dateRange,
  data,
  sections,
  userPlan,
  includeLogo,
}) => {
  // Create dynamic section numbering for executive report based on selected sections
  let currentSectionNumber = 1;
  const getSectionNumber = () => currentSectionNumber++;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          title={title}
          subtitle={subtitle}
          dateRange={dateRange}
          includeLogo={includeLogo}
        />

        {/* Basic sections - only render if included in sections array */}
        {sections.includes("overview") && data.overview && (
          <OverviewSection
            data={data.overview}
            sectionNumber={getSectionNumber()}
          />
        )}
        {sections.includes("platform-highlights") &&
          data.platformHighlights && (
            <PlatformHighlightsSection
              data={data.platformHighlights}
              sectionNumber={getSectionNumber()}
            />
          )}
        {sections.includes("engagement-breakdown") &&
          data.engagementBreakdown && (
            <EngagementBreakdownSection
              data={data.engagementBreakdown}
              sectionNumber={getSectionNumber()}
            />
          )}

        {/* Comprehensive sections - only render if included in sections array */}
        {sections.includes("audience-demographics") &&
          data.audienceDemographics && (
            <AudienceDemographicsSection
              data={data.audienceDemographics}
              sectionNumber={getSectionNumber()}
            />
          )}
        {sections.includes("content-performance") &&
          data.contentPerformance && (
            <ContentPerformanceSection
              data={data.contentPerformance}
              sectionNumber={getSectionNumber()}
            />
          )}
        {sections.includes("hashtag-analysis") && data.hashtagAnalysis && (
          <HashtagAnalysisSection
            data={data.hashtagAnalysis}
            sectionNumber={getSectionNumber()}
          />
        )}
        {sections.includes("posting-schedule") && data.postingSchedule && (
          <PostingScheduleSection
            data={data.postingSchedule}
            sectionNumber={getSectionNumber()}
          />
        )}

        {/* Executive-only sections - only render if included in sections array */}
        {sections.includes("executive-summary") && data.executiveSummary && (
          <ExecutiveSummarySection
            data={data.executiveSummary}
            sectionNumber={getSectionNumber()}
          />
        )}
        {sections.includes("roi-analysis") && data.roiAnalysis && (
          <ROIAnalysisSection
            data={data.roiAnalysis}
            sectionNumber={getSectionNumber()}
          />
        )}
        {sections.includes("competitive-analysis") &&
          data.competitiveAnalysis && (
            <CompetitiveAnalysisSection
              data={data.competitiveAnalysis}
              sectionNumber={getSectionNumber()}
            />
          )}

        <PDFFooter userPlan={userPlan} pageNumber={1} totalPages={1} />
      </Page>
    </Document>
  );
};
