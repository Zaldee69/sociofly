import { GeneratedContentWithAnalytics } from "./content-generator";
import { industryConfig, IndustryType } from "../config/industry-config";

// Helper functions for analytics
function calculateReadabilityScore(text: string): number {
  // Enhanced Flesch Reading Ease score calculation
  const words = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).length;
  const syllables = countSyllables(text);

  if (words === 0 || sentences === 0) return 0;

  // Calculate average sentence length
  const avgSentenceLength = words / sentences;

  // Calculate average syllables per word
  const avgSyllablesPerWord = syllables / words;

  // Calculate score with adjusted weights
  const score =
    206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

  // Normalize to 0-100
  return Math.min(Math.max(score, 0), 100);
}

function countSyllables(text: string): number {
  // Enhanced syllable counting
  const words = text.toLowerCase().split(/\s+/);
  return words.reduce((count, word) => {
    // Count vowel groups
    const vowelGroups = word.match(/[aeiouy]+/g) || [];

    // Handle special cases
    if (word.endsWith("e")) {
      // Silent 'e' at the end doesn't count
      return count + Math.max(vowelGroups.length - 1, 1);
    }

    // Count diphthongs as one syllable
    const diphthongs = word.match(/[aeiouy]{2,}/g) || [];
    return count + vowelGroups.length - diphthongs.length;
  }, 0);
}

function calculateEngagementScore(
  text: string,
  hashtags: string[],
  platform: string,
  industry?: IndustryType
): number {
  let score = 0;

  // Length score (optimal length varies by platform)
  const lengthScores = {
    instagram: { optimal: 150, max: 2200 },
    tiktok: { optimal: 100, max: 300 },
    facebook: { optimal: 180, max: 2000 },
  };

  const platformConfig =
    lengthScores[platform as keyof typeof lengthScores] ||
    lengthScores.instagram;
  const lengthScore = Math.max(
    0,
    100 -
      (Math.abs(text.length - platformConfig.optimal) / platformConfig.max) *
        100
  );
  score += lengthScore * 0.3;

  // Hashtag score
  const hashtagScore = Math.min(hashtags.length / 5, 1) * 100;
  score += hashtagScore * 0.2;

  // Emoji score
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  const emojiScore = Math.min(emojiCount / 3, 1) * 100;
  score += emojiScore * 0.15;

  // Industry-specific keyword score
  if (industry && industryConfig[industry]) {
    const keywords = industryConfig[industry].keywords;
    const keywordCount = keywords.filter((keyword: string) =>
      text.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    const keywordScore = (keywordCount / keywords.length) * 100;
    score += keywordScore * 0.15;
  }

  // Question score (questions increase engagement)
  const questionCount = (text.match(/\?/g) || []).length;
  const questionScore = Math.min(questionCount * 20, 100);
  score += questionScore * 0.1;

  // Call-to-action score
  const ctaPhrases = [
    "click",
    "link",
    "comment",
    "share",
    "follow",
    "like",
    "save",
  ];
  const hasCTA = ctaPhrases.some((phrase) =>
    text.toLowerCase().includes(phrase)
  );
  score += hasCTA ? 10 : 0;

  return Math.round(score);
}

function analyzeSentiment(text: string): "positive" | "neutral" | "negative" {
  // Enhanced sentiment analysis
  const positiveWords = [
    "great",
    "amazing",
    "wonderful",
    "excellent",
    "best",
    "love",
    "happy",
    "excited",
    "fantastic",
    "brilliant",
    "perfect",
    "awesome",
    "incredible",
    "beautiful",
    "stunning",
    "impressive",
    "outstanding",
    "superb",
    "magnificent",
    "delightful",
  ];

  const negativeWords = [
    "bad",
    "terrible",
    "awful",
    "worst",
    "hate",
    "sad",
    "angry",
    "disappointed",
    "poor",
    "horrible",
    "dreadful",
    "miserable",
    "annoying",
    "frustrating",
    "upset",
    "disgusting",
    "awful",
    "terrible",
    "horrendous",
    "atrocious",
  ];

  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;

  // Count positive and negative words
  words.forEach((word) => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });

  // Calculate sentiment ratio
  const total = positiveCount + negativeCount;
  if (total === 0) return "neutral";

  const ratio = positiveCount / total;

  if (ratio > 0.6) return "positive";
  if (ratio < 0.4) return "negative";
  return "neutral";
}

interface BaseAnalytics {
  engagementScore: number;
  readabilityScore: number;
  sentiment: "positive" | "neutral" | "negative";
}

interface EnhancedAnalytics extends BaseAnalytics {
  readabilityDetails: {
    sentenceCount: number;
    avgSentenceLength: number;
    avgWordLength: number;
    complexityLevel: "simple" | "moderate" | "complex";
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
}

function calculateReadabilityDetails(
  text: string
): EnhancedAnalytics["readabilityDetails"] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/);
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const avgSentenceLength = words.length / sentences.length;
  const avgWordLength =
    words.reduce((sum, word) => sum + word.length, 0) / words.length;

  // Calculate word diversity (unique words / total words)
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  const wordDiversity = uniqueWords.size / words.length;

  let complexityLevel: "simple" | "moderate" | "complex";
  if (avgSentenceLength < 10 && avgWordLength < 5) {
    complexityLevel = "simple";
  } else if (avgSentenceLength < 20 && avgWordLength < 7) {
    complexityLevel = "moderate";
  } else {
    complexityLevel = "complex";
  }

  return {
    sentenceCount: sentences.length,
    avgSentenceLength,
    avgWordLength,
    complexityLevel,
    paragraphCount: paragraphs.length,
    wordDiversity,
  };
}

function calculateEngagementDetails(
  text: string,
  hashtags: string[],
  industry?: IndustryType
): EnhancedAnalytics["engagementDetails"] {
  const hasQuestion = /\?/.test(text);
  const hasCTA = /(?:click|link|comment|share|follow|like|save)/i.test(text);
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;

  let keywordMatchCount = 0;
  if (industry && industryConfig[industry]) {
    const keywords = industryConfig[industry].keywords;
    keywordMatchCount = keywords.filter((keyword) =>
      text.toLowerCase().includes(keyword.toLowerCase())
    ).length;
  }

  // Calculate interaction score based on various factors
  const interactionScore = Math.min(
    (hasQuestion ? 20 : 0) +
      (hasCTA ? 30 : 0) +
      emojiCount * 5 +
      hashtags.length * 2 +
      keywordMatchCount * 10,
    100
  );

  // Calculate viral potential based on content characteristics
  const viralPotential = Math.min(
    (text.length > 100 ? 20 : 0) +
      (hasQuestion ? 15 : 0) +
      (hasCTA ? 25 : 0) +
      emojiCount * 5 +
      hashtags.length * 3 +
      keywordMatchCount * 10,
    100
  );

  return {
    hasQuestion,
    hasCTA,
    emojiCount,
    hashtagCount: hashtags.length,
    keywordMatchCount,
    interactionScore,
    viralPotential,
  };
}

function calculatePlatformOptimization(
  text: string,
  platform: string
): EnhancedAnalytics["platformOptimization"] {
  const lengthScores = {
    instagram: { optimal: 150, max: 2200 },
    tiktok: { optimal: 100, max: 300 },
    facebook: { optimal: 180, max: 2000 },
  };

  const platformConfig =
    lengthScores[platform as keyof typeof lengthScores] ||
    lengthScores.instagram;
  const lengthScore = Math.max(
    0,
    100 -
      (Math.abs(text.length - platformConfig.optimal) / platformConfig.max) *
        100
  );

  // Format score based on line breaks and emojis
  const hasLineBreaks = /\n\n/.test(text);
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  const formatScore = (hasLineBreaks ? 50 : 0) + Math.min(emojiCount * 10, 50);

  // Tag score based on mentions and hashtags
  const mentionCount = (text.match(/@\w+/g) || []).length;
  const hashtagCount = (text.match(/#\w+/g) || []).length;
  const tagScore = Math.min((mentionCount + hashtagCount) * 10, 100);

  // Best practices score based on platform-specific rules
  const bestPracticesScore = calculateBestPracticesScore(text, platform);

  // Platform-specific score based on unique platform requirements
  const platformSpecificScore = calculatePlatformSpecificScore(text, platform);

  return {
    lengthScore,
    formatScore,
    tagScore,
    bestPracticesScore,
    platformSpecificScore,
  };
}

function calculateBestPracticesScore(text: string, platform: string): number {
  let score = 0;

  // Check for common best practices
  if (text.length > 0) score += 20; // Non-empty content
  if (text.includes("?")) score += 15; // Includes question
  if (text.includes("!")) score += 10; // Includes exclamation
  if (text.includes("\n\n")) score += 15; // Uses paragraphs
  if (text.match(/[\u{1F300}-\u{1F9FF}]/gu)) score += 10; // Uses emojis
  if (text.match(/#\w+/g)) score += 15; // Uses hashtags
  if (text.match(/@\w+/g)) score += 15; // Uses mentions

  return Math.min(score, 100);
}

function calculatePlatformSpecificScore(
  text: string,
  platform: string
): number {
  let score = 0;

  switch (platform) {
    case "instagram":
      if (text.includes("📍")) score += 20; // Location tag
      if (text.includes("📸")) score += 15; // Photo reference
      if (text.includes("💫")) score += 10; // Story highlight
      break;
    case "tiktok":
      if (text.includes("🎵")) score += 20; // Sound reference
      if (text.includes("⏱️")) score += 15; // Timestamp
      if (text.includes("🎯")) score += 10; // Challenge reference
      break;
    case "facebook":
      if (text.includes("📊")) score += 20; // Statistics
      if (text.includes("💼")) score += 15; // Professional reference
      if (text.includes("🔗")) score += 10; // Article link
      break;
  }

  return Math.min(score, 100);
}

function calculateContentQuality(
  text: string,
  industry?: IndustryType
): EnhancedAnalytics["contentQuality"] {
  // Simple grammar check (can be enhanced with a proper grammar checking library)
  const grammarScore = Math.min(
    (text.match(/[.!?]$/g)?.length || 0) * 20 + // Proper sentence endings
      (text.match(/[A-Z][a-z]+/g)?.length || 0) * 5 + // Proper capitalization
      (text.match(/[^.!?]+[.!?]/g)?.length || 0) * 10, // Complete sentences
    100
  );

  // Tone consistency check
  const toneConsistency = calculateToneConsistency(text);

  // Brand alignment check
  const brandAlignment = industry
    ? calculateBrandAlignment(text, industry)
    : 50;

  // Uniqueness score (can be enhanced with more sophisticated algorithms)
  const uniquenessScore = calculateUniquenessScore(text);

  return {
    grammarScore,
    toneConsistency,
    brandAlignment,
    uniquenessScore,
  };
}

function calculateToneConsistency(text: string): number {
  // Simple tone consistency check
  const formalMarkers =
    /(?:therefore|however|furthermore|consequently|moreover)/i;
  const casualMarkers = /(?:hey|awesome|cool|yeah|wow)/i;
  const promotionalMarkers = /(?:limited|offer|deal|sale|discount)/i;

  const hasFormal = formalMarkers.test(text);
  const hasCasual = casualMarkers.test(text);
  const hasPromotional = promotionalMarkers.test(text);

  // Count how many different tones are present
  const toneCount = [hasFormal, hasCasual, hasPromotional].filter(
    Boolean
  ).length;

  // Perfect consistency is 100, mixed tones reduce the score
  return Math.max(100 - (toneCount - 1) * 30, 0);
}

function calculateBrandAlignment(text: string, industry: IndustryType): number {
  const industryData = industryConfig[industry];
  if (!industryData) return 50;

  const keywords = industryData.keywords;
  const tone = industryData.tone;

  // Check keyword presence
  const keywordScore = keywords.reduce(
    (score: number, keyword: string) =>
      score + (text.toLowerCase().includes(keyword.toLowerCase()) ? 20 : 0),
    0
  );

  // Check tone alignment
  const toneScore = text.toLowerCase().includes(tone.toLowerCase()) ? 30 : 0;

  return Math.min(keywordScore + toneScore, 100);
}

function calculateUniquenessScore(text: string): number {
  // Simple uniqueness check based on word frequency
  const words = text.toLowerCase().split(/\s+/);
  const wordFrequency = new Map<string, number>();

  words.forEach((word) => {
    wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
  });

  // Calculate uniqueness based on word frequency
  const uniqueWords = Array.from(wordFrequency.entries()).filter(
    ([_, count]) => count === 1
  ).length;

  return Math.min((uniqueWords / words.length) * 100, 100);
}

export function calculateAnalytics(
  content: { caption: string; hashtags: string[] },
  platform: string,
  industry?: IndustryType
): EnhancedAnalytics {
  const baseAnalytics = {
    engagementScore: calculateEngagementScore(
      content.caption,
      content.hashtags,
      platform,
      industry
    ),
    readabilityScore: calculateReadabilityScore(content.caption),
    sentiment: analyzeSentiment(content.caption),
  };

  return {
    ...baseAnalytics,
    readabilityDetails: calculateReadabilityDetails(content.caption),
    engagementDetails: calculateEngagementDetails(
      content.caption,
      content.hashtags,
      industry
    ),
    platformOptimization: calculatePlatformOptimization(
      content.caption,
      platform
    ),
    contentQuality: calculateContentQuality(content.caption, industry),
  };
}

// Example usage
const analysis = calculateAnalytics(
  {
    caption: "Check out our new product launch! 🚀 #innovation",
    hashtags: ["#innovation", "#tech", "#newproduct"],
  },
  "instagram",
  "tech"
);
