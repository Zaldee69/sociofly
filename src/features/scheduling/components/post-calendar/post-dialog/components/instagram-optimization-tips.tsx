"use client";

import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { FileWithStablePreview } from "../types";
import { AlertTriangle, Info } from "lucide-react";

// Instagram image specifications based on Buffer documentation
const INSTAGRAM_SPECS = {
  FEED: {
    SQUARE: { width: 1080, height: 1080, aspectRatio: "1:1" },
    PORTRAIT_4_5: { width: 1080, height: 1350, aspectRatio: "4:5" },
    PORTRAIT_3_4: { width: 1080, height: 1440, aspectRatio: "3:4" },
    LANDSCAPE: { width: 1080, height: 566, aspectRatio: "16:9" },
  },
  STORY: { width: 1080, height: 1920, aspectRatio: "9:16" },
  REELS: { width: 1080, height: 1920, aspectRatio: "9:16" },
  PROFILE: { width: 320, height: 320, aspectRatio: "1:1" },
} as const;

// Utility functions
const getImageDimensions = (
  fileOrUrl: File | string
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    let objectUrl: string | null = null;

    img.onload = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(
        new Error(
          `Failed to load image: ${fileOrUrl instanceof File ? fileOrUrl.name : fileOrUrl}`
        )
      );
    };

    try {
      if (fileOrUrl instanceof File) {
        if (!fileOrUrl.type.startsWith("image/")) {
          reject(new Error(`File ${fileOrUrl.name} is not an image`));
          return;
        }
        objectUrl = URL.createObjectURL(fileOrUrl);
        img.src = objectUrl;
      } else {
        // If it's a URL string, use it directly
        img.src = fileOrUrl;
      }
    } catch (error) {
      reject(
        new Error(
          `Failed to load image: ${fileOrUrl instanceof File ? fileOrUrl.name : fileOrUrl}`
        )
      );
    }
  });
};

const calculateAspectRatio = (width: number, height: number): string => {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

const getInstagramFeedFormat = (width: number, height: number) => {
  const aspectRatio = calculateAspectRatio(width, height);

  if (aspectRatio === "1:1") return INSTAGRAM_SPECS.FEED.SQUARE;
  if (aspectRatio === "4:5") return INSTAGRAM_SPECS.FEED.PORTRAIT_4_5;
  if (aspectRatio === "3:4") return INSTAGRAM_SPECS.FEED.PORTRAIT_3_4;
  if (aspectRatio === "16:9") return INSTAGRAM_SPECS.FEED.LANDSCAPE;

  if (width === height) return INSTAGRAM_SPECS.FEED.SQUARE;
  if (height > width) {
    const ratio = width / height;
    return ratio > 0.75
      ? INSTAGRAM_SPECS.FEED.PORTRAIT_4_5
      : INSTAGRAM_SPECS.FEED.PORTRAIT_3_4;
  }
  return INSTAGRAM_SPECS.FEED.LANDSCAPE;
};

const validateInstagramImage = (width: number, height: number) => {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const recommendedFormat = getInstagramFeedFormat(width, height);
  const currentRatio = calculateAspectRatio(width, height);

  // Check if dimensions match Instagram recommendations
  if (width < 1080 && height < 1080) {
    warnings.push(`Low resolution (${width}×${height}px)`);
    suggestions.push(
      `Upload at least ${recommendedFormat.width}×${recommendedFormat.height}px for best quality`
    );
  }

  // Check aspect ratio compliance
  if (currentRatio !== recommendedFormat.aspectRatio) {
    suggestions.push(
      `Consider ${recommendedFormat.aspectRatio} aspect ratio (${recommendedFormat.width}×${recommendedFormat.height}px)`
    );
  }

  // Check for square crop on profile grid
  if (currentRatio !== "1:1") {
    suggestions.push(
      "Instagram grid crops to 3:4 - keep important content centered"
    );
  }

  return { warnings, suggestions, recommendedFormat, currentRatio };
};

interface InstagramOptimizationTipsProps {
  files: FileWithStablePreview[];
  className?: string;
  showImageRequirement?: boolean;
}

export const InstagramOptimizationTips = memo(
  ({
    files,
    className,
    showImageRequirement = false,
  }: InstagramOptimizationTipsProps) => {
    const [validations, setValidations] = useState<{ [key: string]: any }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Reset states when files array becomes empty
    useEffect(() => {
      if (files.length === 0) {
        setValidations({});
        setIsLoading(false);
        setIsVisible(showImageRequirement);
      }
    }, [files.length, showImageRequirement]);

    // Memoize validation function to prevent unnecessary recalculations
    const validateImages = useCallback(
      async (imagesToValidate: FileWithStablePreview[]) => {
        const newValidations: { [key: string]: any } = {};

        for (const file of imagesToValidate) {
          try {
            // For FileWithStablePreview, we use the preview URL
            const dimensions = await getImageDimensions(file.preview);
            const validation = validateInstagramImage(
              dimensions.width,
              dimensions.height
            );
            newValidations[file.stableId] = {
              ...validation,
              dimensions,
              filename: file.name,
            };
          } catch (error) {
            newValidations[file.stableId] = {
              warnings: ["Unable to analyze image"],
              suggestions: ["Please check if file is a valid image"],
              dimensions: null,
              filename: file.name,
            };
          }
        }

        return newValidations;
      },
      []
    );

    useEffect(() => {
      let isMounted = true;

      // Show component immediately if we need to show image requirement
      if (showImageRequirement) {
        setIsVisible(true);
        return;
      }

      // Process images only if we have files
      if (files.length > 0) {
        // Delay showing the component to prevent flashing
        const showTimeout = setTimeout(() => {
          if (isMounted) {
            setIsVisible(true);
          }
        }, 150);

        const processImages = async () => {
          if (!isMounted) return;
          setIsLoading(true);
          try {
            const newValidations = await validateImages(files);
            if (isMounted) {
              // Add a small delay before showing results
              setTimeout(() => {
                setValidations(newValidations);
                setIsLoading(false);
              }, 100);
            }
          } catch (error) {
            if (isMounted) {
              setIsLoading(false);
              setValidations({});
            }
          }
        };

        processImages();

        return () => {
          isMounted = false;
          clearTimeout(showTimeout);
        };
      }
    }, [files, validateImages, showImageRequirement]);

    // Memoize computed values
    const { hasValidations, hasIssues } = useMemo(
      () => ({
        hasValidations: Object.keys(validations).length > 0,
        hasIssues: Object.values(validations).some(
          (v: any) => v?.warnings?.length > 0 || v?.suggestions?.length > 0
        ),
      }),
      [validations]
    );

    // Return null if no files and no image requirement message needed
    if (!showImageRequirement && files.length === 0) {
      return null;
    }

    // Return null if no validations and no image requirement message needed
    if (!showImageRequirement && !hasValidations && !isLoading) {
      return null;
    }

    return (
      <div
        className={cn(
          "rounded-lg border transition-all duration-300 ease-in-out",
          !isVisible && "opacity-0 translate-y-2",
          isVisible && "opacity-100 translate-y-0",
          className
        )}
      >
        {/* Image Requirement Message */}
        {showImageRequirement && (
          <div className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-800 text-sm">
                  📱 Instagram Post Requirements
                </h3>
                <p className="text-blue-600 text-sm mt-1">
                  Instagram posts require at least one image. Please add an
                  image to continue.
                </p>
                <div className="mt-2 text-xs text-blue-500">
                  <p>Recommended image specifications:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Square (1:1) - 1080×1080px</li>
                    <li>Portrait (4:5) - 1080×1350px</li>
                    <li>Landscape (16:9) - 1080×566px</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && files.length > 0 && (
          <div className="p-4 bg-blue-50 border-blue-200 transition-all duration-300 ease-in-out">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <div>
                <h3 className="font-semibold text-blue-800 text-sm">
                  📱 Analyzing Instagram Optimization
                </h3>
                <p className="text-blue-600 text-xs mt-1">
                  Checking {files.length} image(s) for best Instagram quality...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Validation Results */}
        {!isLoading && hasValidations && (
          <div
            className={cn(
              "p-4 transition-all duration-300 ease-in-out",
              hasIssues
                ? "bg-yellow-50 border-yellow-200"
                : "bg-green-50 border-green-200"
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{hasIssues ? "⚠️" : "✅"}</span>
              <div className="flex-1">
                <h3
                  className={cn(
                    "font-semibold text-sm mb-2",
                    hasIssues ? "text-yellow-800" : "text-green-800"
                  )}
                >
                  📱 Instagram Optimization{" "}
                  {hasIssues ? "Recommendations" : "Complete"}
                </h3>

                {hasIssues ? (
                  <div className="space-y-3">
                    {Object.entries(validations).map(
                      ([id, validation]: [string, any]) => {
                        if (
                          !validation?.warnings?.length &&
                          !validation?.suggestions?.length
                        )
                          return null;

                        return (
                          <div key={id} className="space-y-1">
                            <p className="font-medium text-yellow-700 text-sm">
                              📷 {validation.filename}
                            </p>

                            {validation.warnings?.map(
                              (warning: string, index: number) => (
                                <p
                                  key={`warning-${index}`}
                                  className="text-orange-700 text-xs ml-4"
                                >
                                  • {warning}
                                </p>
                              )
                            )}

                            {validation.suggestions
                              ?.slice(0, 2)
                              .map((suggestion: string, index: number) => (
                                <p
                                  key={`suggestion-${index}`}
                                  className="text-blue-700 text-xs ml-4"
                                >
                                  💡 {suggestion}
                                </p>
                              ))}

                            {validation.dimensions && (
                              <p className="text-gray-600 text-xs ml-4">
                                Current: {validation.dimensions.width}×
                                {validation.dimensions.height}px (
                                {validation.currentRatio})
                              </p>
                            )}
                          </div>
                        );
                      }
                    )}

                    <div className="mt-3 pt-3 border-t border-yellow-200">
                      <p className="text-yellow-700 text-xs">
                        💡 <strong>Tip:</strong> Higher resolution images
                        perform better on Instagram
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-green-700 text-sm">
                      All {files.length} image(s) are optimized for Instagram!
                    </p>
                    <div className="space-y-1">
                      {Object.entries(validations).map(
                        ([id, validation]: [string, any]) => (
                          <p key={id} className="text-green-600 text-xs">
                            ✓ {validation.filename}:{" "}
                            {validation.dimensions?.width}×
                            {validation.dimensions?.height}px (
                            {validation.currentRatio})
                          </p>
                        )
                      )}
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    "mt-3 pt-3 text-xs",
                    hasIssues
                      ? "border-t border-yellow-200"
                      : "border-t border-green-200"
                  )}
                >
                  <a
                    href="https://buffer.com/resources/instagram-image-size/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "underline hover:no-underline",
                      hasIssues ? "text-yellow-600" : "text-green-600"
                    )}
                  >
                    📖 Instagram Size Guide by Buffer
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

InstagramOptimizationTips.displayName = "InstagramOptimizationTips";
