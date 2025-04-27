import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Hash,
  PartyPopper,
  Briefcase,
  Megaphone,
  Heart,
  Languages,
  Instagram,
  Linkedin,
  Video,
  ChevronDown,
  Settings2,
  Sparkles,
  Copy,
  Check,
  Loader2,
  User,
  TrendingUp,
  Target,
  Users,
  Facebook,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useAIContent } from "@/app/(pages)/schedule-post/contexts/ai-content-context";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useContentGenerator } from "@/app/(pages)/schedule-post/hooks/use-content-generator";
import { IndustryType } from "@/lib/config/industry-config";
import { GeneratedContentWithAnalytics } from "@/lib/services/content-generator";

const AICaptionGenerator = () => {
  const {
    generateContent,
    content,
    isLoading,
    error: generatorError,
  } = useContentGenerator();
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "tiktok" | "facebook">(
    "instagram"
  );
  const [industry, setIndustry] = useState<string>("tech");
  const [brandName, setBrandName] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (generatorError) {
      toast.error("Failed to generate content", {
        description: generatorError,
      });
    }
  }, [generatorError]);

  const generateCaption = async (actionPrompt?: string) => {
    if (!actionPrompt && !currentPrompt.trim()) return;

    try {
      await generateContent({
        prompt: actionPrompt || currentPrompt,
        style: "casual",
        language: "id",
        platform,
        industry: industry as IndustryType,
        brandName,
        selectedText: currentPrompt,
      });
      setCurrentPrompt("");
    } catch (error) {
      // Error is already handled by the hook
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      generateCaption();
    }
  };

  const quickActions = [
    {
      icon: <MessageSquare className="h-4 w-4" />,
      label: "Caption",
      prompt: "Social media caption for this content",
    },
    {
      icon: <Hash className="h-4 w-4" />,
      label: "Hashtags",
      prompt: "Relevant trending hashtags for this content",
    },
    {
      icon: <PartyPopper className="h-4 w-4" />,
      label: "Fun & Casual",
      prompt: "Fun casual social media caption with hashtags",
    },
    {
      icon: <Briefcase className="h-4 w-4" />,
      label: "Professional",
      prompt: "Professional business caption with industry hashtags",
    },
    {
      icon: <Megaphone className="h-4 w-4" />,
      label: "Promotional",
      prompt: "Promotional marketing caption with hashtags",
    },
    {
      icon: <Heart className="h-4 w-4" />,
      label: "Inspirational",
      prompt: "Inspirational motivational caption with positive hashtags",
    },
    {
      icon: <Languages className="h-4 w-4" />,
      label: "Translate",
      prompt: "Translate to English with English hashtags",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Trending",
      prompt: "Generate currently trending and popular hashtags",
    },
  ];

  const handleCopyToClipboard = async (
    content: Pick<GeneratedContentWithAnalytics, "caption" | "hashtags">
  ) => {
    try {
      await navigator.clipboard.writeText(
        content.caption + "\n\n" + content.hashtags.join(" ")
      );
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="flex flex-col gap-4" data-ai-assistant>
      <div className="space-y-4">
        <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2">
                <Settings2 className="h-4 w-4 mr-2" />
                <span className="text-sm">Settings</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 ml-2 transition-transform",
                    isSettingsOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={platform}
                  onValueChange={(value: "instagram" | "tiktok" | "facebook") =>
                    setPlatform(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        <span>Instagram</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="tiktok">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        <span>TikTok</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="facebook">
                      <div className="flex items-center gap-2">
                        <Facebook className="h-4 w-4" />
                        <span>Facebook</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech">Technology</SelectItem>
                    <SelectItem value="fashion">Fashion</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="beauty">Beauty</SelectItem>
                    <SelectItem value="fitness">Fitness</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Brand Name (Optional)</Label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter your brand name"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Textarea
          ref={inputRef}
          value={currentPrompt}
          onChange={(e) => {
            setCurrentPrompt(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="What would you like me to help you with?"
          className="min-h-[80px] resize-none"
          data-ai-textarea
        />

        {generatorError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {generatorError}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => generateCaption(action.prompt)}
              className="flex flex-col items-center gap-1 h-auto py-2"
              disabled={isLoading}
            >
              {action.icon}
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Generating...</span>
        </div>
      )}

      {content && !isLoading && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <p className="font-medium">Generated Content</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyToClipboard(content)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm">
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[120px]">
              <p className="text-sm text-muted-foreground">{content.caption}</p>

              <div className="mt-4">
                <div className="flex flex-wrap gap-1 pb-2">
                  {content.hashtags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </ScrollArea>
            {content.analytics && (
              <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Engagement
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${content.analytics.engagementScore}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs">
                      {content.analytics.engagementScore}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Quality
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${content.analytics.contentQuality.grammarScore}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs">
                      {content.analytics.contentQuality.grammarScore}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AICaptionGenerator;
