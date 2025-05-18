"use client";
import { useChat } from "@ai-sdk/react";
import { Chat } from "@/components/ui/chat";
import { Message } from "@/components/ui/chat-message";
import { useState, useEffect, useCallback } from "react";
import {
  Hash,
  ScanText,
  SmilePlus,
  MousePointerClick,
  Sparkles,
  Repeat,
  List,
  Megaphone,
  Flame,
  Globe,
  MessageSquare,
  Shuffle,
  AlignJustify,
  Check,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageList } from "@/components/ui/message-list";
import { CopyButton } from "@/components/ui/copy-button";
import { ScrollArea } from "@radix-ui/react-scroll-area";

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

// Define the type for prompt suggestions
type PromptSuggestion = {
  text: string;
  prompt: string;
  icon: React.ReactNode;
  customElement?: React.ReactNode;
};

// Define chat state type
export type ChatState = {
  messages: {
    id: string;
    role: "user" | "assistant" | "system" | "data";
    content: string;
    createdAt?: Date;
  }[];
  promptSelected: boolean;
  initialPromptShown: boolean;
};

interface CustomChatProps {
  initialContext?: string;
  onApplyResult?: (result: string) => void;
  chatState?: ChatState | null;
  onChatStateChange?: (state: ChatState) => void;
}

export function CustomChat({
  initialContext,
  onApplyResult,
  chatState,
  onChatStateChange,
}: CustomChatProps) {
  // Extract existing messages and state from parent component if provided
  const existingMessages = chatState?.messages || [];
  const existingPromptSelected = chatState?.promptSelected || false;
  const existingInitialPromptShown = chatState?.initialPromptShown || false;

  const {
    messages: aiMessages,
    input,
    handleInputChange,
    handleSubmit,
    append,
    isLoading,
    stop,
    setMessages,
  } = useChat({
    api: "/api/chat",
    // Use existing messages if available
    initialMessages: existingMessages,
  });

  const [initialPromptShown, setInitialPromptShown] = useState(
    existingInitialPromptShown
  );
  const [promptSelected, setPromptSelected] = useState(existingPromptSelected);

  // Update parent component with chat state when it changes
  useEffect(() => {
    if (onChatStateChange) {
      onChatStateChange({
        messages: aiMessages,
        promptSelected,
        initialPromptShown,
      } as ChatState);
    }
  }, [aiMessages, promptSelected, initialPromptShown, onChatStateChange]);

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

  // Function to handle prompt selection directly
  const handlePromptSelection = (promptContent: string) => {
    setPromptSelected(true);

    // Show initial welcome message only on first message
    if (aiMessages.length === 0 && !initialPromptShown) {
      setInitialPromptShown(true);
    }

    // Send the user prompt
    append({
      role: "user",
      content: promptContent,
    });
  };

  // Function to execute the tone change when button is clicked
  const handleToneButtonClick = () => {
    if (selectedTone) {
      handlePromptSelection(
        `${selectedTone.prompt} untuk konten berikut:\n\n${initialContext}`
      );
    }
  };

  // Function to apply AI results to the original content
  const handleApplyResults = useCallback(
    (content: string) => {
      if (onApplyResult) {
        onApplyResult(content);
      }
    },
    [onApplyResult]
  );

  // Convert AI SDK messages to the format expected by shadcn-chatbot-kit
  const messages = aiMessages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: new Date(),
  })) as Message[];

  // Define actionable prompt templates with icons
  const promptSuggestions: PromptSuggestion[] = [
    {
      text: "Add Hashtags",
      prompt: `Add relevant hashtags to this content to increase engagement:\n\n${initialContext}`,
      icon: <Hash className="mr-2 h-4 w-4" />,
    },
    {
      text: "Shorten Text",
      prompt: `Make this text more concise while preserving the core message:\n\n${initialContext}`,
      icon: <ScanText className="mr-2 h-4 w-4" />,
    },
    {
      text: "Lengthen Text",
      prompt: `Expand this content by adding more relevant details, making it more engaging and informative:\n\n${initialContext}`,
      icon: <AlignJustify className="mr-2 h-4 w-4" />,
    },
    {
      text: "Add Emojis",
      prompt: `Add appropriate emojis to make this content more engaging:\n\n${initialContext}`,
      icon: <SmilePlus className="mr-2 h-4 w-4" />,
    },
    {
      text: "Add Call-to-Action",
      prompt: `Add an effective call-to-action to encourage audience engagement for this content:\n\n${initialContext}`,
      icon: <MousePointerClick className="mr-2 h-4 w-4" />,
    },
    {
      text: "Repurpose Content",
      prompt: `Rewrite this content to suit a different social media platform while keeping the core message intact:\n\n${initialContext}`,
      icon: <Repeat className="mr-2 h-4 w-4" />,
    },
    {
      text: "Summarize Key Points",
      prompt: `Extract and summarize the key points from this content for quick reading:\n\n${initialContext}`,
      icon: <List className="mr-2 h-4 w-4" />,
    },
    {
      text: "Generate Hook",
      prompt: `Create a strong opening sentence to grab attention in the first 3 seconds for this content:\n\n${initialContext}`,
      icon: <Megaphone className="mr-2 h-4 w-4" />,
    },
    {
      text: "Make Viral Style",
      prompt: `Rewrite this content in a viral, trending style suitable for Indonesian social media audiences:\n\n${initialContext}`,
      icon: <Flame className="mr-2 h-4 w-4" />,
    },
    {
      text: "Localize Content",
      prompt: `Adapt this content to include Indonesian cultural references and trending topics:\n\n${initialContext}`,
      icon: <Globe className="mr-2 h-4 w-4" />,
    },
    {
      text: "Add Engagement Question",
      prompt: `Add an interactive question to encourage audience comments and discussions for this content:\n\n${initialContext}`,
      icon: <MessageSquare className="mr-2 h-4 w-4" />,
    },
    {
      text: "Generate Hashtag Variations",
      prompt: `Provide multiple variations of relevant hashtags for A/B testing for this content:\n\n${initialContext}`,
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
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Select a tone and click "Apply" to rewrite your content
          </p>
        </div>
      ),
    },
  ];

  // Use onRateResponse to detect when user wants to apply content from a message
  const handleRateResponse = useCallback(
    (messageId: string, rating: "thumbs-up" | "thumbs-down") => {
      if (rating === "thumbs-up" && onApplyResult) {
        const message = messages.find((msg) => msg.id === messageId);
        if (message && message.role === "assistant") {
          handleApplyResults(message.content);
        }
      }
    },
    [messages, handleApplyResults, onApplyResult]
  );

  // Show welcome screen if no messages and prompt not selected
  const showWelcomeScreen =
    !promptSelected && aiMessages.length === 0 && initialContext;

  return (
    <div className="flex flex-col h-full">
      {showWelcomeScreen ? (
        <div className="flex h-full w-full justify-center items-center">
          <div className="w-full md:w-7/12 flex flex-col p-4 items-center justify-center">
            <div className="w-full max-w-lg bg-card rounded-lg shadow-lg p-6 space-y-4">
              <h2 className="text-2xl font-bold">Hello! I'm FlyBot.</h2>
              <p className="text-lg">
                Here's your draft content. Select one of the options on the
                right to help improve or modify it.
              </p>

              <div className="mt-4 p-4 bg-background rounded-lg border">
                <p className="whitespace-pre-wrap break-words">
                  {initialContext}
                </p>
              </div>

              <div className="flex flex-col gap-2 mt-6">
                <p className="text-sm text-muted-foreground">
                  Choose prompt suggestions on the right to get started →
                </p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex md:w-5/12 p-4 bg-muted/10 border-l">
            <div className="w-full">
              <h3 className="font-medium mb-3">Try these prompts ✨</h3>
              <div
                style={{ maxHeight: "calc(70vh - 120px)" }}
                className="space-y-4 pr-4 container overflow-auto"
              >
                <div className="space-y-2">
                  {promptSuggestions.map((suggestion, index) =>
                    suggestion.customElement ? (
                      <div key={index}>{suggestion.customElement}</div>
                    ) : (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-2.5"
                        onClick={() => {
                          if (suggestion.prompt) {
                            handlePromptSelection(suggestion.prompt);
                          }
                        }}
                      >
                        {suggestion.icon}
                        <span>{suggestion.text}</span>
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="h-full flex flex-col relative">
            <Chat
              messages={messages}
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={
                promptSelected
                  ? handleSubmit
                  : (e) => {
                      e?.preventDefault?.();
                    }
              }
              isGenerating={isLoading}
              stop={stop}
              append={append}
              suggestionsWithIcons={promptSuggestions}
              className="h-full w-full flex flex-row-reverse grid-rows-none"
              onRateResponse={handleRateResponse}
            />

            {!promptSelected && (
              <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-2 z-10 border-t">
                <div className="text-center text-sm text-muted-foreground">
                  <p>Please select a prompt to start the conversation</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
