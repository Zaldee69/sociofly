import React, { createContext, useContext, useState, ReactNode } from "react";
import { GeneratedContentWithAnalytics } from "@/lib/services/content-generator";

interface AIContentContextType {
  prompt: string;
  setPrompt: (prompt: string) => void;
  generatedContent: GeneratedContentWithAnalytics | null;
  setGeneratedContent: (content: GeneratedContentWithAnalytics | null) => void;
  style: "formal" | "casual" | "promotional";
  setStyle: (style: "formal" | "casual" | "promotional") => void;
  language: "id" | "en";
  setLanguage: (language: "id" | "en") => void;
  applyContent: (type: "caption" | "hashtags") => void;
  setMainContent: (content: string) => void;
  onContentChange?: (content: string) => void;
}

const AIContentContext = createContext<AIContentContextType | undefined>(
  undefined
);

interface AIContentProviderProps {
  children: ReactNode;
  initialPrompt?: string;
  onContentChange?: (content: string) => void;
}

export const AIContentProvider = ({
  children,
  initialPrompt = "",
  onContentChange,
}: AIContentProviderProps) => {
  const [generatedContent, setGeneratedContent] =
    useState<GeneratedContentWithAnalytics | null>(null);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [style, setStyle] = useState<"formal" | "casual" | "promotional">(
    "casual"
  );
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [mainContent, setMainContent] = useState("");

  const applyContent = (type: "caption" | "hashtags") => {
    if (!generatedContent) return;

    let newContent = mainContent;

    if (type === "caption") {
      newContent = generatedContent.caption;
    }

    if (type === "hashtags") {
      const hashtags = generatedContent.hashtags.join(" ");
      newContent = hashtags;
    }

    setMainContent(newContent);
    // Call the onContentChange callback if provided
    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  return (
    <AIContentContext.Provider
      value={{
        generatedContent,
        setGeneratedContent,
        prompt,
        setPrompt,
        style,
        setStyle,
        language,
        setLanguage,
        applyContent,
        setMainContent,
        onContentChange,
      }}
    >
      {children}
    </AIContentContext.Provider>
  );
};

export function useAIContent() {
  const context = useContext(AIContentContext);
  if (context === undefined) {
    throw new Error("useAIContent must be used within an AIContentProvider");
  }
  return context;
}
