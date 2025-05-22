import { useTeamContext } from "@/lib/contexts/team-context";
import { MediaThumbnail } from "./media-thumbnail";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface MediaGridProps {
  filter: "all" | "images" | "videos";
  searchTerm: string;
  viewMode: "grid" | "list";
  currentPage: number;
  itemsPerPage: number;
}

export function MediaGrid({
  filter,
  searchTerm,
  viewMode,
  currentPage,
  itemsPerPage,
}: MediaGridProps) {
  const { currentTeamId, isLoading: isLoadingTeam } = useTeamContext();

  const {
    data: mediaData,
    isLoading,
    isError,
  } = trpc.media.getAll.useQuery(
    {
      filter,
      search: searchTerm,
      teamId: currentTeamId || "",
      page: currentPage,
      limit: itemsPerPage,
    },
    {
      enabled: !!currentTeamId,
    }
  );

  const media = mediaData?.items || [];
  const isLoadingState = isLoading || isLoadingTeam;

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        Failed to load media. Please try again.
      </div>
    );
  }

  if (isLoadingState) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentTeamId) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        Please select a team to view media.
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No media found. Upload some files to get started.
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${currentTeamId}-${viewMode}-${currentPage}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "gap-4",
          viewMode === "grid"
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            : "flex flex-col"
        )}
      >
        {media.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { delay: index * 0.05 },
            }}
            exit={{ opacity: 0, y: -20 }}
          >
            <MediaThumbnail
              item={item}
              showControls={viewMode === "list"}
              className={cn(viewMode === "list" && "h-[200px] w-full")}
            />
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
