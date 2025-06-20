import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Download,
  Settings,
  Eye,
  Calendar,
  BarChart3,
  Users,
  TrendingUp,
  Image,
  Palette,
  Crown,
  Lock,
} from "lucide-react";

// Types
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: "basic" | "advanced" | "premium";
  sections: ReportSection[];
  preview: string;
}

interface ReportSection {
  id: string;
  name: string;
  description: string;
  type: "overview" | "posts" | "audience" | "growth" | "custom";
  required: boolean;
  premium?: boolean;
}

interface ReportCustomization {
  title: string;
  subtitle: string;
  dateRange: string;
  includeLogo: boolean;
  includeWatermark: boolean;
  colorScheme: string;
  sections: string[];
  customText?: string;
  brandColors?: {
    primary: string;
    secondary: string;
  };
}

interface CustomReportsProps {
  userPlan: "free" | "pro" | "enterprise";
  socialAccountId?: string;
  teamId?: string;
}

const CustomReports: React.FC<CustomReportsProps> = ({
  userPlan = "enterprise", // Changed from "advanced" to "enterprise" for testing
  socialAccountId,
  teamId,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customization, setCustomization] = useState<ReportCustomization>({
    title: "Social Media Analytics Report",
    subtitle: "Performance Summary",
    dateRange: "30d",
    includeLogo: true,
    includeWatermark: userPlan === "free",
    colorScheme: "default",
    sections: [],
    customText: "",
    brandColors: {
      primary: "#3b82f6",
      secondary: "#64748b",
    },
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Report Templates
  const reportTemplates: ReportTemplate[] = [
    {
      id: "basic-summary",
      name: "📈 Basic Summary Report",
      description:
        "Essential metrics and performance overview with platform comparison",
      category: "basic",
      preview: "/api/reports/preview/basic-summary.png",
      sections: [
        {
          id: "overview",
          name: "📊 Overview Metrics",
          description:
            "Total followers, posts, engagement rate, and top platform",
          type: "overview",
          required: true,
        },
        {
          id: "platform-highlights",
          name: "📱 Platform Highlights",
          description:
            "Detailed platform comparison table with followers, posts, engagement rates, and reach",
          type: "posts",
          required: false,
        },
        {
          id: "engagement-breakdown",
          name: "💬 Engagement Breakdown",
          description:
            "Likes, comments, and shares breakdown across all platforms",
          type: "posts",
          required: false,
        },
      ],
    },
    {
      id: "comprehensive",
      name: "💡 Comprehensive Report",
      description:
        "All Basic Report content + detailed audience insights and optimization recommendations",
      category: "advanced",
      preview: "/api/reports/preview/comprehensive.png",
      sections: [
        // Include all Basic sections
        {
          id: "overview",
          name: "📊 Overview Metrics",
          description:
            "Total followers, posts, engagement rate, and top platform",
          type: "overview",
          required: true,
        },
        {
          id: "platform-highlights",
          name: "📱 Platform Highlights",
          description:
            "Detailed platform comparison table with followers, posts, engagement rates, and reach",
          type: "posts",
          required: false,
        },
        {
          id: "engagement-breakdown",
          name: "💬 Engagement Breakdown",
          description:
            "Likes, comments, and shares breakdown across all platforms",
          type: "posts",
          required: false,
        },
        // Additional Comprehensive sections
        {
          id: "audience-demographics",
          name: "👥 Audience Demographics",
          description: "Gender split, age ranges, and top geographic locations",
          type: "audience",
          required: false,
        },
        {
          id: "content-performance",
          name: "🎯 Content Performance",
          description:
            "Top performing posts with date, platform, format, reach, and engagement",
          type: "posts",
          required: false,
        },
        {
          id: "hashtag-analysis",
          name: "# Hashtag Analysis",
          description:
            "Hashtag performance with impressions and engagement metrics",
          type: "audience",
          required: false,
          premium: userPlan === "free",
        },
        {
          id: "posting-schedule",
          name: "⏰ Posting Schedule",
          description: "Optimal posting times and days for each platform",
          type: "audience",
          required: false,
        },
      ],
    },
    {
      id: "executive",
      name: "🔢 Executive Dashboard",
      description:
        "Complete analytics suite: All Basic & Comprehensive content + ROI analysis and competitive benchmarking",
      category: "premium",
      preview: "/api/reports/preview/executive.png",
      sections: [
        // Include all Basic sections
        {
          id: "overview",
          name: "📊 Overview Metrics",
          description:
            "Total followers, posts, engagement rate, and top platform",
          type: "overview",
          required: true,
        },
        {
          id: "platform-highlights",
          name: "📱 Platform Highlights",
          description:
            "Detailed platform comparison table with followers, posts, engagement rates, and reach",
          type: "posts",
          required: false,
        },
        {
          id: "engagement-breakdown",
          name: "💬 Engagement Breakdown",
          description:
            "Likes, comments, and shares breakdown across all platforms",
          type: "posts",
          required: false,
        },
        // Include all Comprehensive sections
        {
          id: "audience-demographics",
          name: "👥 Audience Demographics",
          description: "Gender split, age ranges, and top geographic locations",
          type: "audience",
          required: false,
        },
        {
          id: "content-performance",
          name: "🎯 Content Performance",
          description:
            "Top performing posts with date, platform, format, reach, and engagement",
          type: "posts",
          required: false,
        },
        {
          id: "hashtag-analysis",
          name: "# Hashtag Analysis",
          description:
            "Hashtag performance with impressions and engagement metrics",
          type: "audience",
          required: false,
        },
        {
          id: "posting-schedule",
          name: "⏰ Posting Schedule",
          description: "Optimal posting times and days for each platform",
          type: "audience",
          required: false,
        },
        // Executive-only sections
        {
          id: "executive-summary",
          name: "📋 Executive Summary",
          description:
            "Growth rates, ROI insights, and strategic recommendations",
          type: "custom",
          required: true,
          premium: userPlan !== "enterprise",
        },
        {
          id: "roi-analysis",
          name: "💰 ROI Analysis",
          description:
            "Ad spend, leads, cost per lead, and conversion rates by platform",
          type: "custom",
          required: false,
          premium: userPlan !== "enterprise",
        },
        {
          id: "competitive-analysis",
          name: "🏆 Competitive Analysis",
          description:
            "Competitor benchmarking with follower counts, engagement rates, and content strategies",
          type: "custom",
          required: false,
          premium: userPlan !== "enterprise",
        },
      ],
    },
  ];

  // Available color schemes
  const colorSchemes = [
    {
      id: "default",
      name: "Default Blue",
      primary: "#3b82f6",
      secondary: "#64748b",
    },
    {
      id: "green",
      name: "Nature Green",
      primary: "#10b981",
      secondary: "#6b7280",
    },
    {
      id: "purple",
      name: "Royal Purple",
      primary: "#8b5cf6",
      secondary: "#6b7280",
    },
    {
      id: "orange",
      name: "Vibrant Orange",
      primary: "#f59e0b",
      secondary: "#6b7280",
    },
    {
      id: "custom",
      name: "Custom Colors",
      primary: "#000000",
      secondary: "#000000",
    },
  ];

  // Check if user can access template
  const canAccessTemplate = (template: ReportTemplate) => {
    if (template.category === "basic") return true;
    if (template.category === "advanced") return userPlan !== "free";
    if (template.category === "premium") return userPlan === "enterprise";
    return false;
  };

  // Check if user can access section
  const canAccessSection = (section: ReportSection) => {
    if (section.premium && userPlan === "free") return false;
    return true;
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = reportTemplates.find((t) => t.id === templateId);
    if (!template || !canAccessTemplate(template)) return;

    setSelectedTemplate(templateId);
    setCustomization((prev) => ({
      ...prev,
      sections: template.sections
        .filter((s) => s.required || canAccessSection(s))
        .map((s) => s.id),
    }));
  };

  // Handle section toggle
  const handleSectionToggle = (sectionId: string, enabled: boolean) => {
    const template = reportTemplates.find((t) => t.id === selectedTemplate);
    const section = template?.sections.find((s) => s.id === sectionId);

    if (!section || !canAccessSection(section)) return;

    setCustomization((prev) => ({
      ...prev,
      sections: enabled
        ? [...prev.sections, sectionId]
        : prev.sections.filter((id) => id !== sectionId),
    }));
  };

  // Generate PDF Report
  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    try {
      // Get the selected template object
      const template = reportTemplates.find((t) => t.id === selectedTemplate);
      if (!template) {
        throw new Error("Template not found");
      }

      // Map template to API format
      let templateName = selectedTemplate;
      if (selectedTemplate === "basic") templateName = "basic-summary";
      if (selectedTemplate === "advanced") templateName = "comprehensive";
      if (selectedTemplate === "executive") templateName = "executive";

      console.log("🔄 Generating report with:", {
        template: templateName,
        customization,
        userPlan,
      });

      // This would typically call an API endpoint
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: templateName, // Send template name string instead of templateId
          customization,
          userPlan,
        }),
      });

      console.log("📡 Response status:", response.status);

      if (response.ok) {
        const blob = await response.blob();
        console.log("📄 PDF Blob size:", blob.size, "bytes");

        if (blob.size === 0) {
          throw new Error("Received empty PDF file");
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${customization.title.replace(/\s+/g, "-")}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        alert("✅ Report generated successfully!");
      } else {
        // Handle error response
        const errorText = await response.text();
        console.error("❌ API Error Response:", errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        throw new Error(
          errorData.error || `HTTP ${response.status}: ${errorText}`
        );
      }
    } catch (error) {
      console.error("❌ Error generating report:", error);
      alert(
        `❌ Failed to generate report: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedTemplateData = reportTemplates.find(
    (t) => t.id === selectedTemplate
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Custom Reports
          </h2>
          <p className="text-muted-foreground">
            Create professional PDF reports with your analytics data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              userPlan === "free"
                ? "secondary"
                : userPlan === "pro"
                  ? "default"
                  : "destructive"
            }
          >
            {userPlan === "free" && "Free Plan"}
            {userPlan === "pro" && "Pro Plan"}
            {userPlan === "enterprise" && "Enterprise"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Template Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportTemplates.map((template) => {
                const canAccess = canAccessTemplate(template);
                const isSelected = selectedTemplate === template.id;

                return (
                  <div
                    key={template.id}
                    className={`
                      relative p-4 border-2 rounded-xl cursor-pointer transition-all
                      ${isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50 hover:shadow-sm"}
                      ${!canAccess ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                    onClick={() =>
                      canAccess && handleTemplateSelect(template.id)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-base">
                            {template.name}
                          </h4>
                          {template.category === "premium" && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                          {!canAccess && (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                          {isSelected && (
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {template.description}
                        </p>

                        {/* Preview sections */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-700">
                            What's included:
                          </p>
                          <div className="grid gap-1">
                            {template.sections.slice(0, 3).map((section) => (
                              <div
                                key={section.id}
                                className="flex items-center gap-2"
                              >
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                <span className="text-xs text-gray-600">
                                  {section.name}
                                </span>
                                {section.premium && (
                                  <Crown className="h-3 w-3 text-yellow-500" />
                                )}
                              </div>
                            ))}
                            {template.sections.length > 3 && (
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                <span className="text-xs text-gray-500">
                                  +{template.sections.length - 3} more sections
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <Badge
                            variant={
                              template.category === "basic"
                                ? "secondary"
                                : template.category === "advanced"
                                  ? "default"
                                  : "destructive"
                            }
                            className="text-xs"
                          >
                            {template.category === "basic" && "Free"}
                            {template.category === "advanced" && "Pro"}
                            {template.category === "premium" && "Enterprise"}
                          </Badge>

                          {canAccess ? (
                            <Badge
                              variant="outline"
                              className="text-xs text-green-600 border-green-200"
                            >
                              ✓ Available
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs text-orange-600 border-orange-200"
                            >
                              Upgrade Required
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {!canAccess && (
                      <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <div className="text-center p-4">
                          <Lock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            {template.category === "advanced"
                              ? "Pro Plan Required"
                              : "Enterprise Required"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Upgrade to access this template
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Customization Panel */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="space-y-6">
              {/* Basic Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Report Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Report Title</Label>
                      <Input
                        id="title"
                        value={customization.title}
                        onChange={(e) =>
                          setCustomization((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        placeholder="Enter report title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subtitle">Subtitle</Label>
                      <Input
                        id="subtitle"
                        value={customization.subtitle}
                        onChange={(e) =>
                          setCustomization((prev) => ({
                            ...prev,
                            subtitle: e.target.value,
                          }))
                        }
                        placeholder="Enter subtitle"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dateRange">Date Range</Label>
                      <Select
                        value={customization.dateRange}
                        onValueChange={(value) =>
                          setCustomization((prev) => ({
                            ...prev,
                            dateRange: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7d">Last 7 days</SelectItem>
                          <SelectItem value="30d">Last 30 days</SelectItem>
                          <SelectItem value="90d">Last 90 days</SelectItem>
                          <SelectItem value="1y">Last year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="colorScheme">Color Scheme</Label>
                      <Select
                        value={customization.colorScheme}
                        onValueChange={(value) =>
                          setCustomization((prev) => ({
                            ...prev,
                            colorScheme: value,
                          }))
                        }
                        disabled={userPlan === "free"}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {colorSchemes.map((scheme) => (
                            <SelectItem key={scheme.id} value={scheme.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: scheme.primary }}
                                />
                                {scheme.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {userPlan === "free" && (
                        <p className="text-xs text-muted-foreground">
                          Custom colors available in Pro plan
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="includeLogo">Include Logo</Label>
                      <p className="text-xs text-muted-foreground">
                        Add your brand logo to the report
                      </p>
                    </div>
                    <Switch
                      id="includeLogo"
                      checked={customization.includeLogo}
                      onCheckedChange={(checked) =>
                        setCustomization((prev) => ({
                          ...prev,
                          includeLogo: checked,
                        }))
                      }
                      disabled={userPlan === "free"}
                    />
                  </div>

                  {userPlan === "free" && (
                    <div className="flex items-center justify-between opacity-50">
                      <div className="space-y-0.5">
                        <Label>Watermark</Label>
                        <p className="text-xs text-muted-foreground">
                          "Generated by PostSpark" watermark
                        </p>
                      </div>
                      <Switch checked={true} disabled />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Report Sections</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedTemplateData?.sections.map((section) => {
                    const canAccess = canAccessSection(section);
                    const isEnabled = customization.sections.includes(
                      section.id
                    );

                    return (
                      <div
                        key={section.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">
                              {section.name}
                            </h4>
                            {section.premium && (
                              <Crown className="h-3 w-3 text-yellow-500" />
                            )}
                            {section.required && (
                              <Badge variant="secondary" className="text-xs">
                                Required
                              </Badge>
                            )}
                            {!canAccess && (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {section.description}
                          </p>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            handleSectionToggle(section.id, checked)
                          }
                          disabled={section.required || !canAccess}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGenerateReport}
                  disabled={
                    !selectedTemplate ||
                    customization.sections.length === 0 ||
                    isGenerating
                  }
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generate PDF Report
                    </>
                  )}
                </Button>

                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        Report Preview - {selectedTemplateData?.name}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-muted/20 p-8 rounded-lg">
                        <div className="bg-white p-8 rounded shadow-sm max-w-3xl mx-auto space-y-6">
                          {/* Header */}
                          <div className="flex justify-between items-start border-b pb-6 mb-6">
                            <div>
                              {customization.includeLogo && (
                                <div className="w-24 h-8 bg-gray-200 rounded mb-4 flex items-center justify-center text-xs text-gray-500">
                                  Logo
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <h1 className="text-2xl font-bold text-gray-900">
                                {customization.title}
                              </h1>
                              <p className="text-gray-600">
                                {customization.subtitle}
                              </p>
                              <p className="text-sm text-gray-500">
                                {customization.dateRange === "7d" &&
                                  "Last 7 days"}
                                {customization.dateRange === "30d" &&
                                  "Last 30 days"}
                                {customization.dateRange === "90d" &&
                                  "Last 90 days"}
                                {customization.dateRange === "1y" &&
                                  "Last year"}
                              </p>
                            </div>
                          </div>

                          {/* Content based on template and sections */}
                          {selectedTemplate === "basic-summary" && (
                            <div className="space-y-6">
                              {customization.sections.includes("overview") && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    1. Overview
                                  </h2>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3 rounded border flex justify-between">
                                      <span className="text-sm font-medium text-gray-600">
                                        Total Followers:
                                      </span>
                                      <span className="text-sm font-bold">
                                        21,000
                                      </span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border flex justify-between">
                                      <span className="text-sm font-medium text-gray-600">
                                        Total Posts:
                                      </span>
                                      <span className="text-sm font-bold">
                                        40
                                      </span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border flex justify-between">
                                      <span className="text-sm font-medium text-gray-600">
                                        Engagement Rate:
                                      </span>
                                      <span className="text-sm font-bold">
                                        5.5%
                                      </span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border flex justify-between">
                                      <span className="text-sm font-medium text-gray-600">
                                        Top Platform:
                                      </span>
                                      <span className="text-sm font-bold">
                                        Instagram
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {customization.sections.includes(
                                "platform-highlights"
                              ) && (
                                <>
                                  <div>
                                    <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                      2. Platform Highlights
                                    </h2>
                                    <div className="border rounded overflow-hidden">
                                      <table className="w-full text-sm">
                                        <thead className="bg-gray-100">
                                          <tr>
                                            <th className="text-left p-3 font-bold">
                                              Platform
                                            </th>
                                            <th className="text-center p-3 font-bold">
                                              Followers
                                            </th>
                                            <th className="text-center p-3 font-bold">
                                              Posts
                                            </th>
                                            <th className="text-center p-3 font-bold">
                                              Engagement Rate
                                            </th>
                                            <th className="text-center p-3 font-bold">
                                              Reach
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr className="border-t">
                                            <td className="p-3">Instagram</td>
                                            <td className="p-3 text-center">
                                              10,000
                                            </td>
                                            <td className="p-3 text-center">
                                              20
                                            </td>
                                            <td className="p-3 text-center">
                                              6.8%
                                            </td>
                                            <td className="p-3 text-center">
                                              50,000
                                            </td>
                                          </tr>
                                          <tr className="border-t">
                                            <td className="p-3">Facebook</td>
                                            <td className="p-3 text-center">
                                              8,000
                                            </td>
                                            <td className="p-3 text-center">
                                              12
                                            </td>
                                            <td className="p-3 text-center">
                                              3.2%
                                            </td>
                                            <td className="p-3 text-center">
                                              30,000
                                            </td>
                                          </tr>
                                          <tr className="border-t">
                                            <td className="p-3">LinkedIn</td>
                                            <td className="p-3 text-center">
                                              3,000
                                            </td>
                                            <td className="p-3 text-center">
                                              8
                                            </td>
                                            <td className="p-3 text-center">
                                              5.4%
                                            </td>
                                            <td className="p-3 text-center">
                                              15,000
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </>
                              )}

                              {customization.sections.includes(
                                "engagement-breakdown"
                              ) && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    3. Engagement Breakdown
                                  </h2>
                                  <div className="border rounded overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="text-left p-3 font-bold">
                                            Metric
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Instagram
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Facebook
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            LinkedIn
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-t">
                                          <td className="p-3">Likes</td>
                                          <td className="p-3 text-center">
                                            4,000
                                          </td>
                                          <td className="p-3 text-center">
                                            1,500
                                          </td>
                                          <td className="p-3 text-center">
                                            800
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">Comments</td>
                                          <td className="p-3 text-center">
                                            320
                                          </td>
                                          <td className="p-3 text-center">
                                            100
                                          </td>
                                          <td className="p-3 text-center">
                                            75
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">Shares</td>
                                          <td className="p-3 text-center">
                                            180
                                          </td>
                                          <td className="p-3 text-center">
                                            90
                                          </td>
                                          <td className="p-3 text-center">
                                            120
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {selectedTemplate === "comprehensive" && (
                            <div className="space-y-6">
                              {/* Basic sections included in Comprehensive */}
                              {customization.sections.includes("overview") && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    1. Overview
                                  </h2>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3 rounded border flex justify-between">
                                      <span className="text-sm font-medium text-gray-600">
                                        Total Followers:
                                      </span>
                                      <span className="text-sm font-bold">
                                        21,000
                                      </span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border flex justify-between">
                                      <span className="text-sm font-medium text-gray-600">
                                        Total Posts:
                                      </span>
                                      <span className="text-sm font-bold">
                                        40
                                      </span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border flex justify-between">
                                      <span className="text-sm font-medium text-gray-600">
                                        Engagement Rate:
                                      </span>
                                      <span className="text-sm font-bold">
                                        5.5%
                                      </span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border flex justify-between">
                                      <span className="text-sm font-medium text-gray-600">
                                        Top Platform:
                                      </span>
                                      <span className="text-sm font-bold">
                                        Instagram
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {customization.sections.includes(
                                "platform-highlights"
                              ) && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    2. Platform Highlights
                                  </h2>
                                  <div className="border rounded overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="text-left p-3 font-bold">
                                            Platform
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Followers
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Posts
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Engagement Rate
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Reach
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-t">
                                          <td className="p-3">Instagram</td>
                                          <td className="p-3 text-center">
                                            10,000
                                          </td>
                                          <td className="p-3 text-center">
                                            20
                                          </td>
                                          <td className="p-3 text-center">
                                            6.8%
                                          </td>
                                          <td className="p-3 text-center">
                                            50,000
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">Facebook</td>
                                          <td className="p-3 text-center">
                                            8,000
                                          </td>
                                          <td className="p-3 text-center">
                                            12
                                          </td>
                                          <td className="p-3 text-center">
                                            3.2%
                                          </td>
                                          <td className="p-3 text-center">
                                            30,000
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">LinkedIn</td>
                                          <td className="p-3 text-center">
                                            3,000
                                          </td>
                                          <td className="p-3 text-center">8</td>
                                          <td className="p-3 text-center">
                                            5.4%
                                          </td>
                                          <td className="p-3 text-center">
                                            15,000
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {customization.sections.includes(
                                "engagement-breakdown"
                              ) && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    3. Engagement Breakdown
                                  </h2>
                                  <div className="border rounded overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="text-left p-3 font-bold">
                                            Metric
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Instagram
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Facebook
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            LinkedIn
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-t">
                                          <td className="p-3">Likes</td>
                                          <td className="p-3 text-center">
                                            4,000
                                          </td>
                                          <td className="p-3 text-center">
                                            1,500
                                          </td>
                                          <td className="p-3 text-center">
                                            800
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">Comments</td>
                                          <td className="p-3 text-center">
                                            320
                                          </td>
                                          <td className="p-3 text-center">
                                            100
                                          </td>
                                          <td className="p-3 text-center">
                                            75
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">Shares</td>
                                          <td className="p-3 text-center">
                                            180
                                          </td>
                                          <td className="p-3 text-center">
                                            90
                                          </td>
                                          <td className="p-3 text-center">
                                            120
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {customization.sections.includes(
                                "audience-demographics"
                              ) && (
                                <>
                                  <div>
                                    <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                      4. Audience Demographics
                                    </h2>
                                    <div className="space-y-3">
                                      <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                        <span className="text-sm">
                                          Gender: 55% Female, 45% Male
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                        <span className="text-sm">
                                          Age Range: 25-34 (Top segment)
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                        <span className="text-sm">
                                          Location: Jakarta, Surabaya, Bandung
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {customization.sections.includes(
                                    "content-performance"
                                  ) && (
                                    <div>
                                      <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                        5. Content Performance
                                      </h2>
                                      <div className="border rounded overflow-hidden">
                                        <table className="w-full text-sm">
                                          <thead className="bg-gray-100">
                                            <tr>
                                              <th className="text-left p-3 font-bold">
                                                Date
                                              </th>
                                              <th className="text-left p-3 font-bold">
                                                Platform
                                              </th>
                                              <th className="text-left p-3 font-bold">
                                                Format
                                              </th>
                                              <th className="text-center p-3 font-bold">
                                                Reach
                                              </th>
                                              <th className="text-center p-3 font-bold">
                                                Engagement
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr className="border-t">
                                              <td className="p-3">12/09</td>
                                              <td className="p-3">Instagram</td>
                                              <td className="p-3">Reels</td>
                                              <td className="p-3 text-center">
                                                10,000
                                              </td>
                                              <td className="p-3 text-center">
                                                2,000
                                              </td>
                                            </tr>
                                            <tr className="border-t">
                                              <td className="p-3">18/09</td>
                                              <td className="p-3">LinkedIn</td>
                                              <td className="p-3">Carousel</td>
                                              <td className="p-3 text-center">
                                                4,000
                                              </td>
                                              <td className="p-3 text-center">
                                                950
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {customization.sections.includes(
                                    "hashtag-analysis"
                                  ) && (
                                    <div>
                                      <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                        6. Hashtag Analysis
                                      </h2>
                                      <div className="border rounded overflow-hidden">
                                        <table className="w-full text-sm">
                                          <thead className="bg-gray-100">
                                            <tr>
                                              <th className="text-left p-3 font-bold">
                                                Hashtag
                                              </th>
                                              <th className="text-center p-3 font-bold">
                                                Impressions
                                              </th>
                                              <th className="text-center p-3 font-bold">
                                                Engagement
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr className="border-t">
                                              <td className="p-3">
                                                #MarketingTips
                                              </td>
                                              <td className="p-3 text-center">
                                                10,000
                                              </td>
                                              <td className="p-3 text-center">
                                                1,200
                                              </td>
                                            </tr>
                                            <tr className="border-t">
                                              <td className="p-3">
                                                #SocialGrowth
                                              </td>
                                              <td className="p-3 text-center">
                                                7,000
                                              </td>
                                              <td className="p-3 text-center">
                                                850
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {customization.sections.includes(
                                    "posting-schedule"
                                  ) && (
                                    <div>
                                      <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                        7. Posting Schedule Overview
                                      </h2>
                                      <div className="border rounded overflow-hidden">
                                        <table className="w-full text-sm">
                                          <thead className="bg-gray-100">
                                            <tr>
                                              <th className="text-left p-3 font-bold">
                                                Platform
                                              </th>
                                              <th className="text-center p-3 font-bold">
                                                Most Engaged Time
                                              </th>
                                              <th className="text-center p-3 font-bold">
                                                Most Engaged Day
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr className="border-t">
                                              <td className="p-3">Instagram</td>
                                              <td className="p-3 text-center">
                                                6 PM
                                              </td>
                                              <td className="p-3 text-center">
                                                Thursday
                                              </td>
                                            </tr>
                                            <tr className="border-t">
                                              <td className="p-3">LinkedIn</td>
                                              <td className="p-3 text-center">
                                                9 AM
                                              </td>
                                              <td className="p-3 text-center">
                                                Tuesday
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {selectedTemplate === "executive" && (
                            <div className="space-y-6">
                              {/* All Basic sections */}
                              {customization.sections.includes("overview") && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    1. Overview
                                  </h2>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3 rounded border flex justify-between">
                                      <span className="text-sm font-medium text-gray-600">
                                        Total Followers:
                                      </span>
                                      <span className="text-sm font-bold">
                                        21,000
                                      </span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border flex justify-between">
                                      <span className="text-sm font-medium text-gray-600">
                                        Total Posts:
                                      </span>
                                      <span className="text-sm font-bold">
                                        40
                                      </span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border flex justify-between">
                                      <span className="text-sm font-medium text-gray-600">
                                        Engagement Rate:
                                      </span>
                                      <span className="text-sm font-bold">
                                        5.5%
                                      </span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded border flex justify-between">
                                      <span className="text-sm font-medium text-gray-600">
                                        Top Platform:
                                      </span>
                                      <span className="text-sm font-bold">
                                        Instagram
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {customization.sections.includes(
                                "platform-highlights"
                              ) && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    2. Platform Highlights
                                  </h2>
                                  <div className="border rounded overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="text-left p-3 font-bold">
                                            Platform
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Followers
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Posts
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Engagement Rate
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Reach
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-t">
                                          <td className="p-3">Instagram</td>
                                          <td className="p-3 text-center">
                                            10,000
                                          </td>
                                          <td className="p-3 text-center">
                                            20
                                          </td>
                                          <td className="p-3 text-center">
                                            6.8%
                                          </td>
                                          <td className="p-3 text-center">
                                            50,000
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">Facebook</td>
                                          <td className="p-3 text-center">
                                            8,000
                                          </td>
                                          <td className="p-3 text-center">
                                            12
                                          </td>
                                          <td className="p-3 text-center">
                                            3.2%
                                          </td>
                                          <td className="p-3 text-center">
                                            30,000
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">LinkedIn</td>
                                          <td className="p-3 text-center">
                                            3,000
                                          </td>
                                          <td className="p-3 text-center">8</td>
                                          <td className="p-3 text-center">
                                            5.4%
                                          </td>
                                          <td className="p-3 text-center">
                                            15,000
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {customization.sections.includes(
                                "engagement-breakdown"
                              ) && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    3. Engagement Breakdown
                                  </h2>
                                  <div className="border rounded overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="text-left p-3 font-bold">
                                            Metric
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Instagram
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Facebook
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            LinkedIn
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-t">
                                          <td className="p-3">Likes</td>
                                          <td className="p-3 text-center">
                                            4,000
                                          </td>
                                          <td className="p-3 text-center">
                                            1,500
                                          </td>
                                          <td className="p-3 text-center">
                                            800
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">Comments</td>
                                          <td className="p-3 text-center">
                                            320
                                          </td>
                                          <td className="p-3 text-center">
                                            100
                                          </td>
                                          <td className="p-3 text-center">
                                            75
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">Shares</td>
                                          <td className="p-3 text-center">
                                            180
                                          </td>
                                          <td className="p-3 text-center">
                                            90
                                          </td>
                                          <td className="p-3 text-center">
                                            120
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {customization.sections.includes(
                                "audience-demographics"
                              ) && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    4. Audience Demographics
                                  </h2>
                                  <div className="space-y-3">
                                    <div className="flex items-start gap-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                      <span className="text-sm">
                                        Gender: 55% Female, 45% Male
                                      </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                      <span className="text-sm">
                                        Age Range: 25-34 (Top segment)
                                      </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                      <span className="text-sm">
                                        Location: Jakarta, Surabaya, Bandung
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {customization.sections.includes(
                                "content-performance"
                              ) && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    5. Content Performance
                                  </h2>
                                  <div className="border rounded overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="text-left p-3 font-bold">
                                            Date
                                          </th>
                                          <th className="text-left p-3 font-bold">
                                            Platform
                                          </th>
                                          <th className="text-left p-3 font-bold">
                                            Format
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Reach
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Engagement
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-t">
                                          <td className="p-3">12/09</td>
                                          <td className="p-3">Instagram</td>
                                          <td className="p-3">Reels</td>
                                          <td className="p-3 text-center">
                                            10,000
                                          </td>
                                          <td className="p-3 text-center">
                                            2,000
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">18/09</td>
                                          <td className="p-3">LinkedIn</td>
                                          <td className="p-3">Carousel</td>
                                          <td className="p-3 text-center">
                                            4,000
                                          </td>
                                          <td className="p-3 text-center">
                                            950
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {customization.sections.includes(
                                "hashtag-analysis"
                              ) && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    6. Hashtag Analysis
                                  </h2>
                                  <div className="border rounded overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="text-left p-3 font-bold">
                                            Hashtag
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Impressions
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Engagement
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-t">
                                          <td className="p-3">
                                            #MarketingTips
                                          </td>
                                          <td className="p-3 text-center">
                                            10,000
                                          </td>
                                          <td className="p-3 text-center">
                                            1,200
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">#SocialGrowth</td>
                                          <td className="p-3 text-center">
                                            7,000
                                          </td>
                                          <td className="p-3 text-center">
                                            850
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {customization.sections.includes(
                                "posting-schedule"
                              ) && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    7. Posting Schedule Overview
                                  </h2>
                                  <div className="border rounded overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="text-left p-3 font-bold">
                                            Platform
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Most Engaged Time
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Most Engaged Day
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-t">
                                          <td className="p-3">Instagram</td>
                                          <td className="p-3 text-center">
                                            6 PM
                                          </td>
                                          <td className="p-3 text-center">
                                            Thursday
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">LinkedIn</td>
                                          <td className="p-3 text-center">
                                            9 AM
                                          </td>
                                          <td className="p-3 text-center">
                                            Tuesday
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Executive-only sections */}
                              {customization.sections.includes(
                                "executive-summary"
                              ) && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    8. Executive Summary
                                  </h2>
                                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                                    <div className="space-y-3">
                                      <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                        <span className="text-sm">
                                          Monthly growth rate: 12.5%
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                        <span className="text-sm">
                                          Content type with highest ROI:
                                          Reels/Carousel
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                        <span className="text-sm">
                                          Channel with best engagement:
                                          Instagram
                                        </span>
                                      </div>
                                      <div className="bg-yellow-100 p-3 rounded mt-3">
                                        <p className="text-sm font-medium text-yellow-800">
                                          Strategic Recommendation:
                                        </p>
                                        <p className="text-xs text-yellow-700">
                                          Focus on Instagram content creation
                                          and increase posting frequency during
                                          peak engagement hours.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {customization.sections.includes(
                                "roi-analysis"
                              ) && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    9. ROI Analysis
                                  </h2>
                                  <div className="border rounded overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="text-left p-3 font-bold">
                                            Platform
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Ad Spend
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Leads
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            CPL
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Conversion Rate
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-t">
                                          <td className="p-3">Instagram</td>
                                          <td className="p-3 text-center">
                                            IDR 10M
                                          </td>
                                          <td className="p-3 text-center">
                                            1,000
                                          </td>
                                          <td className="p-3 text-center">
                                            IDR 10,000
                                          </td>
                                          <td className="p-3 text-center">
                                            5%
                                          </td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">Facebook</td>
                                          <td className="p-3 text-center">
                                            IDR 7.5M
                                          </td>
                                          <td className="p-3 text-center">
                                            750
                                          </td>
                                          <td className="p-3 text-center">
                                            IDR 10,000
                                          </td>
                                          <td className="p-3 text-center">
                                            3.5%
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {customization.sections.includes(
                                "competitive-analysis"
                              ) && (
                                <div>
                                  <h2 className="text-lg font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
                                    10. Competitive Analysis
                                  </h2>
                                  <div className="border rounded overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="text-left p-3 font-bold">
                                            Competitor
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Followers
                                          </th>
                                          <th className="text-center p-3 font-bold">
                                            Engagement Rate
                                          </th>
                                          <th className="text-left p-3 font-bold">
                                            Dominant Content
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-t">
                                          <td className="p-3">Brand A</td>
                                          <td className="p-3 text-center">
                                            150,000
                                          </td>
                                          <td className="p-3 text-center">
                                            8.2%
                                          </td>
                                          <td className="p-3">Reels</td>
                                        </tr>
                                        <tr className="border-t">
                                          <td className="p-3">Brand B</td>
                                          <td className="p-3 text-center">
                                            90,000
                                          </td>
                                          <td className="p-3 text-center">
                                            6.5%
                                          </td>
                                          <td className="p-3">Infographics</td>
                                        </tr>
                                        <tr className="border-t bg-blue-50">
                                          <td className="p-3 font-medium">
                                            Our Brand
                                          </td>
                                          <td className="p-3 text-center font-medium">
                                            85,000
                                          </td>
                                          <td className="p-3 text-center font-medium">
                                            7.1%
                                          </td>
                                          <td className="p-3 font-medium">
                                            Carousel + Video
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {userPlan === "free" && (
                            <div className="mt-8 pt-6 border-t text-center">
                              <p className="text-xs text-gray-500">
                                Generated by PostSpark
                              </p>
                            </div>
                          )}

                          <div className="text-center mt-6">
                            <p className="text-xs text-gray-400">
                              *Note: Data is for illustrative purposes and
                              should be replaced with actual platform insights.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Select a Report Template</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a template from the left to start customizing your
                    report
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomReports;
