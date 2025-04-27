import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  PenLine,
  Code2,
  Search,
  Mail,
  CalendarClock,
  Lightbulb,
  Hash,
  Sparkles,
  Pencil,
  Wand2,
  Languages,
  Smile,
  Target,
  ChevronDown,
  Table,
  GitBranch,
  FileText,
  Command as CommandIcon,
  ArrowUpDown,
  Zap,
  TrendingUp,
  Users,
  Briefcase,
  PartyPopper,
  Megaphone,
  Heart,
  MessageSquarePlus,
  Eraser,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useAIContent } from "@/app/(pages)/schedule-post/contexts/ai-content-context";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { AnimatePresence, motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ActionItem {
  icon: React.ReactNode;
  label: string;
  action: () => Promise<void>;
  description: string;
  shortcut?: string;
}

interface ActionCategory {
  title: string;
  items: ActionItem[];
}

const AICaptionGenerator = () => {
  const {
    prompt,
    setPrompt,
    generatedContent,
    setGeneratedContent,
    applyContent,
  } = useAIContent();

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [conversation, setConversation] = useState<
    Array<{ role: "user" | "assistant"; content: string; context?: string }>
  >([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowSuggestions(true);
        if (searchRef.current) {
          searchRef.current.focus();
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selectedText) {
        setSelectedText(selectedText);
        setCurrentPrompt("");
        setShowSuggestions(true);
        if (searchRef.current) {
          searchRef.current.focus();
        }
      }
    };

    document.addEventListener("selectionchange", handleSelection);
    return () =>
      document.removeEventListener("selectionchange", handleSelection);
  }, []);

  React.useEffect(() => {
    if (prompt && !conversation.length) {
      setSelectedText(prompt);
    }
  }, [prompt, conversation.length]);

  const generateCaption = async (actionPrompt?: string) => {
    if (!actionPrompt && !currentPrompt.trim() && !selectedText.trim()) {
      return;
    }

    setIsGenerating(true);
    setShowSuggestions(false);
    const messageToSend = actionPrompt || currentPrompt;

    setConversation((prev) => [
      ...prev,
      {
        role: "user",
        content: messageToSend,
        context: selectedText.trim() ? selectedText : undefined,
      },
    ]);

    // TODO: Replace with actual OpenAI API integration
    setTimeout(() => {
      let response = "";
      if (selectedText) {
        response = `Based on the selected text: "${selectedText}"\n\n`;
        response += "Here's my response: " + messageToSend;
      } else {
        response =
          "Sample AI response based on your text. I understand you want to discuss: " +
          messageToSend;
      }

      setGeneratedContent({
        caption: response,
        hashtags: ["#sample", "#hashtags"],
      });

      setConversation((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);

      setIsGenerating(false);
      setCurrentPrompt("");
      setSelectedText(""); // Clear selected text after generating
    }, 1500);
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
      label: "Make it Shorter",
      description: "Create a more concise version",
      prompt:
        "Make this text shorter and more concise while maintaining the key message",
    },
    {
      icon: <MessageSquarePlus className="h-4 w-4" />,
      label: "Make it Longer",
      description: "Expand the content with more details",
      prompt:
        "Expand this text with more details and examples while maintaining the same tone",
    },
    {
      icon: <Languages className="h-4 w-4" />,
      label: "Translate",
      description: "Translate the content to another language",
      prompt: "Translate this text to Indonesian",
    },
    {
      icon: <Smile className="h-4 w-4" />,
      label: "Make it Casual",
      description: "Convert to a more relaxed, friendly tone",
      prompt: "Rewrite this text in a more casual and friendly tone",
    },
    {
      icon: <Briefcase className="h-4 w-4" />,
      label: "Make it Professional",
      description: "Convert to a more formal, business tone",
      prompt:
        "Rewrite this text in a more professional and formal business tone",
    },
    {
      icon: <Megaphone className="h-4 w-4" />,
      label: "Make it Promotional",
      description: "Optimize for marketing and promotion",
      prompt:
        "Rewrite this text to be more promotional and persuasive for marketing",
    },
    {
      icon: <Eraser className="h-4 w-4" />,
      label: "Fix Spelling & Grammar",
      description: "Correct any writing mistakes",
      prompt:
        "Fix any spelling and grammar mistakes in this text while maintaining its meaning",
    },
  ];

  const actionCategories: ActionCategory[] = [
    {
      title: "Generate",
      items: quickActions.map((action) => ({
        icon: action.icon,
        label: action.label,
        action: () => generateCaption(action.prompt),
        description: action.description,
      })),
    },
    {
      title: "Caption Styles",
      items: [
        {
          icon: <Briefcase className="h-4 w-4 text-purple-400" />,
          label: "Professional",
          action: () =>
            generateCaption(
              "Make this caption professional and business-oriented"
            ),
          description: "Formal, business-like tone",
        },
        {
          icon: <PartyPopper className="h-4 w-4 text-purple-400" />,
          label: "Casual & Fun",
          action: () =>
            generateCaption("Make this caption casual, fun and relatable"),
          description: "Friendly, conversational tone",
        },
        {
          icon: <Megaphone className="h-4 w-4 text-purple-400" />,
          label: "Promotional",
          action: () =>
            generateCaption("Make this caption promotional and persuasive"),
          description: "Sales and marketing focused",
        },
        {
          icon: <Heart className="h-4 w-4 text-purple-400" />,
          label: "Inspirational",
          action: () =>
            generateCaption("Make this caption inspirational and motivational"),
          description: "Uplifting and motivational",
        },
      ],
    },
    {
      title: "Hashtag Types",
      items: [
        {
          icon: <TrendingUp className="h-4 w-4 text-purple-400" />,
          label: "Trending",
          action: () =>
            generateCaption(
              "Generate currently trending hashtags relevant to this content"
            ),
          description: "Popular, trending tags",
        },
        {
          icon: <Users className="h-4 w-4 text-purple-400" />,
          label: "Community",
          action: () =>
            generateCaption("Generate niche and community-specific hashtags"),
          description: "Niche, community-focused",
        },
        {
          icon: <Target className="h-4 w-4 text-purple-400" />,
          label: "Brand-focused",
          action: () =>
            generateCaption("Generate brand and industry-specific hashtags"),
          description: "Brand and industry specific",
        },
      ],
    },
  ];

  const filteredCategories = searchQuery
    ? actionCategories
        .map((category) => ({
          ...category,
          items: category.items.filter((item) =>
            item.label.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((category) => category.items.length > 0)
    : actionCategories;

  return (
    <div className="flex flex-col gap-4">
      {selectedText && (
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">{selectedText}</p>
        </div>
      )}

      <div className="space-y-4">
        <Textarea
          ref={inputRef}
          value={currentPrompt}
          onChange={(e) => setCurrentPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedText
              ? "Enter your instructions for the selected text..."
              : "What would you like me to help you with?"
          }
          className="min-h-[80px] resize-none"
          data-ai-textarea
        />

        <div className="space-y-2">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => generateCaption(action.prompt)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-accent"
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Generating...</span>
        </div>
      )}

      {generatedContent && (
        <div className="flex flex-col gap-2">
          <div className="rounded-md border p-3">
            <p className="whitespace-pre-wrap text-sm">
              {generatedContent.caption}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                navigator.clipboard.writeText(generatedContent.caption);
                toast.success("Copied to clipboard");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                applyContent("caption");
                setGeneratedContent(null);
                setCurrentPrompt("");
                toast.success("Content applied");
              }}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICaptionGenerator;
