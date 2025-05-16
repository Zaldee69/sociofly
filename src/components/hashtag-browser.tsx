"use client";

import { HashtagSearch } from "@/components/hashtag-search";
import { Label } from "@/components/ui/label";

interface HashtagBrowserProps {
  category?: string;
  limit?: number;
  className?: string;
}

export function HashtagBrowser({
  category,
  limit = 15,
  className,
}: HashtagBrowserProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label># Popular Hashtags</Label>
        <HashtagSearch
          category={category}
          limit={limit}
          className={className}
        />
      </div>
    </div>
  );
}
