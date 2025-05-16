"use client";

import { useSearchHashtags } from "@/hooks/use-search-hashtags";
import { usePopularHashtags } from "@/hooks/use-popular-hashtags";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Hash, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "./ui/scroll-area";

interface HashtagSearchProps {
  category?: string;
  limit?: number;
  className?: string;
}

export function HashtagSearch({
  category,
  limit = 15,
  className,
}: HashtagSearchProps) {
  const [hasSearched, setHasSearched] = useState(false);

  // For searching hashtags
  const {
    searchQuery,
    setSearchQuery,
    hashtags: searchResults,
    isLoading: isSearchLoading,
  } = useSearchHashtags({ category, limit });

  // For showing popular hashtags when not searching
  const { hashtags: popularHashtags, isLoading: isPopularLoading } =
    usePopularHashtags({
      category,
      limit,
      enabled: !hasSearched || searchQuery.trim() === "",
    });

  // Determine which hashtags to display based on search state
  const displayHashtags = searchQuery.trim() ? searchResults : popularHashtags;

  const isLoading = searchQuery.trim() ? isSearchLoading : isPopularLoading;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setHasSearched(true);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setHasSearched(false);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search hashtags..."
          value={searchQuery}
          onChange={handleSearch}
          className="pl-8 pr-8"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="relative min-h-[100px]">
        {isLoading ? (
          // Loading skeleton UI
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        ) : displayHashtags.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">
            {searchQuery.trim()
              ? "No hashtags found matching your search."
              : "No popular hashtags available."}
          </div>
        ) : (
          <ScrollArea className="h-[250px] w-full rounded-md border p-4">
            <div className="flex flex-col gap-2 pb-2">
              {displayHashtags.map((hashtag) => (
                <Badge
                  key={hashtag.id}
                  variant="outline"
                  className="rounded-full gap-1 px-3 py-1.5 hover:bg-muted/50 cursor-default inline-flex w-full justify-start"
                >
                  <Hash className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                  <span className="truncate">{hashtag.name}</span>
                  {hashtag.frequency > 0 && (
                    <span className="text-xs text-muted-foreground ml-1.5 font-normal flex-shrink-0">
                      {hashtag.frequency}
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
