import React, { createContext, useContext, useState } from "react";

interface GeneratedContent {
  caption: string;
  hashtags: string[];
}

interface AIContentContextType {
  generatedContent: GeneratedContent | null;
  setGeneratedContent: (content: GeneratedContent | null) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  style: "formal" | "casual" | "promotional";
  setStyle: (style: "formal" | "casual" | "promotional") => void;
  language: "id" | "en";
  setLanguage: (language: "id" | "en") => void;
  applyContent: (type: "caption" | "hashtags" | "both") => void;
  setMainContent: (content: string) => void;
  onContentChange?: (content: string) => void;
}

const AIContentContext = createContext<AIContentContextType | undefined>(
  undefined
);

interface AIContentProviderProps {
  children: React.ReactNode;
  onContentChange?: (content: string) => void;
}

export function AIContentProvider({
  children,
  onContentChange,
}: AIContentProviderProps) {
  const [generatedContent, setGeneratedContent] =
    useState<GeneratedContent | null>(null);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<"formal" | "casual" | "promotional">(
    "casual"
  );
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [mainContent, setMainContent] = useState("");

  const applyContent = (type: "caption" | "hashtags" | "both") => {
    if (!generatedContent) return;

    let newContent = mainContent;

    if (type === "caption" || type === "both") {
      newContent = generatedContent.caption;
    }

    if (type === "hashtags" || type === "both") {
      const hashtags = generatedContent.hashtags.join(" ");
      newContent = type === "both" ? `${newContent}\n\n${hashtags}` : hashtags;
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
}

export function useAIContent() {
  const context = useContext(AIContentContext);
  if (context === undefined) {
    throw new Error("useAIContent must be used within an AIContentProvider");
  }
  return context;
}
