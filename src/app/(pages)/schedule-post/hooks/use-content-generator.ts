import { useState } from 'react';
import { enhancedGenerate, EnhancedOptions } from '@/lib/services/content-generator';

interface UseContentGeneratorReturn {
  generateContent: (options: EnhancedOptions) => Promise<void>;
  content: {
    caption: string;
    hashtags: string[];
    wordCount: number;
    hashtagCount: number;
    style: string;
    language: string;
    analytics: {
      engagementScore: number;
      readabilityScore: number;
      sentiment: 'positive' | 'neutral' | 'negative';
      readabilityDetails: {
        sentenceCount: number;
        avgSentenceLength: number;
        avgWordLength: number;
        complexityLevel: 'simple' | 'moderate' | 'complex';
        paragraphCount: number;
        wordDiversity: number;
      };
      engagementDetails: {
        hasQuestion: boolean;
        hasCTA: boolean;
        emojiCount: number;
        hashtagCount: number;
        keywordMatchCount: number;
        interactionScore: number;
        viralPotential: number;
      };
      platformOptimization: {
        lengthScore: number;
        formatScore: number;
        tagScore: number;
        bestPracticesScore: number;
        platformSpecificScore: number;
      };
      contentQuality: {
        grammarScore: number;
        toneConsistency: number;
        brandAlignment: number;
        uniquenessScore: number;
      };
    };
  } | null;
  isLoading: boolean;
  error: string | null;
}

export function useContentGenerator(): UseContentGeneratorReturn {
  const [content, setContent] = useState<UseContentGeneratorReturn['content']>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateContent = async (options: EnhancedOptions) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await enhancedGenerate(options);
      setContent({
        ...result,
        style: options.style,
        language: options.language,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateContent,
    content,
    isLoading,
    error
  };
} 