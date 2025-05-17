import { ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PromptSuggestionsProps {
  label: string;
  append: (message: { role: "user"; content: string }) => void;
  suggestions: string[];
  suggestionsWithIcons?: Array<{
    text: string;
    icon: ReactNode;
    prompt?: string;
  }>;
}

export function PromptSuggestions({
  label,
  append,
  suggestions,
  suggestionsWithIcons,
}: PromptSuggestionsProps) {
  return (
    <div
      style={{ maxHeight: "calc(90vh - 120px)" }}
      className="space-y-4 pl-4 w-5/12 container overflow-auto"
    >
      <h2 className="text-center text-2xl font-bold">{label}</h2>
      {/* <ScrollArea className="h-[240px] pr-4"> */}
      <div className="flex flex-col gap-3 text-sm">
        {suggestionsWithIcons
          ? suggestionsWithIcons.map((suggestion) => (
              <button
                key={suggestion.text}
                onClick={() =>
                  append({
                    role: "user",
                    content: suggestion.prompt || suggestion.text,
                  })
                }
                className="h-max flex-1 rounded-xl border bg-background p-4 hover:bg-muted flex items-center"
              >
                {suggestion.icon}
                <span>{suggestion.text}</span>
              </button>
            ))
          : suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => append({ role: "user", content: suggestion })}
                className="h-max flex-1 rounded-xl border bg-background p-4 hover:bg-muted"
              >
                <p>{suggestion}</p>
              </button>
            ))}
      </div>
      {/* </ScrollArea> */}
    </div>
  );
}
