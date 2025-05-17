"use client";
import { useChat, type UseChatOptions } from "@ai-sdk/react";
import { Chat } from "@/components/ui/chat";
import { Message } from "@/components/ui/chat-message";
import {
  Hash,
  ScanText,
  SmilePlus,
  Briefcase,
  Coffee,
  MousePointerClick,
} from "lucide-react";

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
      text: "Make Professional",
      prompt: "Rewrite this content in a more professional and formal tone",
      icon: <Briefcase className="mr-2 h-4 w-4" />,
    },
    {
      text: "Make Casual",
      prompt: "Rewrite this content in a more casual and friendly tone",
      icon: <Coffee className="mr-2 h-4 w-4" />,
    },
    {
      text: "Add Call-to-Action",
      prompt:
        "Add an effective call-to-action to encourage audience engagement",
      icon: <MousePointerClick className="mr-2 h-4 w-4" />,
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
