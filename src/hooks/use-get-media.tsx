import { useState, useEffect } from "react";
import { toast } from "sonner";

type Media = {
  id: string;
  name: string;
  url: string;
  user_id: string;
  type: string;
  size: number;
  format: string;
  uploadthing_key: string;
  created_at: string;
};

type UseGetMediaReturn = {
  media: Media[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const useGetMedia = (): UseGetMediaReturn => {
  const [media, setMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMedia = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/media/list");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch media");
      }

      const data = await response.json();
      setMedia(data.media);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  return {
    media,
    isLoading,
    error,
    refetch: fetchMedia,
  };
};

export default useGetMedia;
