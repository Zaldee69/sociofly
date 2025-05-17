"use client";
import { useChat, type UseChatOptions } from "@ai-sdk/react";
import { Chat } from "@/components/ui/chat";
import { Message } from "@/components/ui/chat-message";
import { useState } from "react";
import {
  Hash,
  ScanText,
  SmilePlus,
  Briefcase,
  Coffee,
  MousePointerClick,
  Sparkles,
  Check,
  ChevronDown,
  Repeat,
  List,
  Megaphone,
  Flame,
  Globe,
  MessageSquare,
  Shuffle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Define tone options
const toneOptions = [
  {
    value: "professional",
    title: "Professional",
    description: "Formal and business-oriented tone",
    icon: <span className="mr-2 text-lg">💼</span>,
    prompt: "Rewrite this in a professional and formal tone",
  },
  {
    value: "casual",
    title: "Casual",
    description: "Relaxed and conversational style",
    icon: <span className="mr-2 text-lg">☕</span>,
    prompt: "Rewrite this in a casual and friendly tone",
  },
  {
    value: "enthusiastic",
    title: "Enthusiastic",
    description: "Energetic and positive language",
    icon: <span className="mr-2 text-lg">🎉</span>,
    prompt: "Rewrite this in an enthusiastic and energetic tone",
  },
  {
    value: "serious",
    title: "Serious",
    description: "Direct and factual approach",
    icon: <span className="mr-2 text-lg">✅</span>,
    prompt: "Rewrite this in a serious and straightforward tone",
  },
  {
    value: "humorous",
    title: "Humorous",
    description: "Witty and entertaining style",
    icon: <span className="mr-2 text-lg">😄</span>,
    prompt: "Rewrite this with humor and wit",
  },
  {
    value: "academic",
    title: "Academic",
    description: "Scholarly and research-oriented language",
    icon: <span className="mr-2 text-lg">🎓</span>,
    prompt: "Rewrite this in an academic and scholarly tone",
  },
  {
    value: "creative",
    title: "Creative",
    description: "Imaginative and artistic expression",
    icon: <span className="mr-2 text-lg">🎨</span>,
    prompt: "Rewrite this in a creative and artistic style",
  },
  {
    value: "confident",
    title: "Confident",
    description: "Assertive and self-assured tone",
    icon: <span className="mr-2 text-lg">💪</span>,
    prompt: "Rewrite this in a confident and assertive tone",
  },
  {
    value: "friendly",
    title: "Friendly",
    description: "Warm and approachable language",
    icon: <span className="mr-2 text-lg">🤗</span>,
    prompt: "Rewrite this in a friendly and warm tone",
  },
  {
    value: "motivational",
    title: "Motivational",
    description: "Inspiring and encouraging style",
    icon: <span className="mr-2 text-lg">🚀</span>,
    prompt: "Rewrite this in a motivational and inspiring tone",
  },
  {
    value: "simple",
    title: "Simple",
    description: "Easy to understand and straightforward",
    icon: <span className="mr-2 text-lg">📝</span>,
    prompt: "Rewrite this in a simple and easy-to-understand way",
  },
  {
    value: "technical",
    title: "Technical",
    description: "Specialized and detailed language",
    icon: <span className="mr-2 text-lg">⚙️</span>,
    prompt: "Rewrite this in a technical and detailed manner",
  },
];

export function CustomChat() {
  const {
    messages: aiMessages,
    input,
    handleInputChange,
    handleSubmit,
    append,
    isLoading,
    stop,
  } = useChat({
    api: "/api/chat",
  });

  // State for selected tone
  const [selectedTone, setSelectedTone] = useState<
    (typeof toneOptions)[0] | undefined
  >(undefined);

  // Function to handle tone selection without sending prompt
  const handleToneSelection = (toneValue: string) => {
    const selected = toneOptions.find((tone) => tone.value === toneValue);
    if (selected) {
      setSelectedTone(selected);
    }
  };

  // Function to execute the tone change when button is clicked
  const handleToneButtonClick = () => {
    if (selectedTone) {
      append({ role: "user", content: selectedTone.prompt });
    }
  };

  // Convert AI SDK messages to the format expected by shadcn-chatbot-kit
  const messages = aiMessages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: new Date(),
  })) as Message[];

  // Define actionable prompt templates with icons
  const promptSuggestions = [
    {
      text: "Add Hashtags",
      prompt: "Add relevant hashtags to this content to increase engagement",
      icon: <Hash className="mr-2 h-4 w-4" />,
    },
    {
      text: "Shorten Text",
      prompt: "Make this text more concise while preserving the core message",
      icon: <ScanText className="mr-2 h-4 w-4" />,
    },
    {
      text: "Add Emojis",
      prompt: "Add appropriate emojis to make this content more engaging",
      icon: <SmilePlus className="mr-2 h-4 w-4" />,
    },
    {
      text: "Add Call-to-Action",
      prompt:
        "Add an effective call-to-action to encourage audience engagement",
      icon: <MousePointerClick className="mr-2 h-4 w-4" />,
    },
    {
      text: "Repurpose Content",
      prompt:
        "Rewrite this content to suit a different social media platform while keeping the core message intact.",
      icon: <Repeat className="mr-2 h-4 w-4" />,
    },
    {
      text: "Summarize Key Points",
      prompt:
        "Extract and summarize the key points from this content for quick reading.",
      icon: <List className="mr-2 h-4 w-4" />,
    },
    {
      text: "Generate Hook",
      prompt:
        "Create a strong opening sentence to grab attention in the first 3 seconds.",
      icon: <Megaphone className="mr-2 h-4 w-4" />,
    },
    {
      text: "Make Viral Style",
      prompt:
        "Rewrite this content in a viral, trending style suitable for Indonesian social media audiences.",
      icon: <Flame className="mr-2 h-4 w-4" />,
    },
    {
      text: "Localize Content",
      prompt:
        "Adapt this content to include Indonesian cultural references and trending topics.",
      icon: <Globe className="mr-2 h-4 w-4" />,
    },
    {
      text: "Add Engagement Question",
      prompt:
        "Add an interactive question to encourage audience comments and discussions.",
      icon: <MessageSquare className="mr-2 h-4 w-4" />,
    },
    {
      text: "Generate Hashtag Variations",
      prompt:
        "Provide multiple variations of relevant hashtags for A/B testing.",
      icon: <Shuffle className="mr-2 h-4 w-4" />,
    },
    {
      text: "Change Tone",
      prompt: "Select a tone for your content",
      icon: <Sparkles className="mr-2 h-4 w-4" />,
      customElement: (
        <div className="flex flex-col">
          <div className="flex w-full rounded-xl border bg-background overflow-hidden">
            <div className="flex-grow">
              <Select onValueChange={handleToneSelection}>
                <SelectTrigger className="w-full h-12 border-0 rounded-xl rounded-r-none bg-transparent hover:bg-muted">
                  <SelectValue placeholder="Select a tone">
                    {selectedTone ? (
                      <div className="flex items-center">
                        {selectedTone.icon}
                        <span>{selectedTone.title}</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="mr-2 text-lg">✨</span>
                        <span>Select a tone</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <SelectGroup>
                    {toneOptions.map((tone) => (
                      <SelectItem
                        key={tone.value}
                        value={tone.value}
                        className="flex items-center py-2"
                      >
                        <div className="flex items-center">
                          {tone.icon}
                          <span>{tone.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleToneButtonClick}
              disabled={!selectedTone}
              variant="ghost"
              className="h-12 border-0 rounded-l-none rounded-r-xl px-4 hover:bg-muted"
            >
              Apply
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Chat
      messages={messages}
      input={input}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      isGenerating={isLoading}
      stop={stop}
      append={append}
      suggestionsWithIcons={promptSuggestions}
      className="h-full w-full flex flex-row-reverse grid-rows-none"
    />
  );
}
