import { generateContent as openaiGenerate } from './openai';
import { calculateAnalytics } from './content-analytics';
import { industryConfig, IndustryType } from '../config/industry-config';

// Types
export interface EnhancedOptions {
  prompt: string;
  style: 'formal' | 'casual' | 'promotional';
  language: 'id' | 'en';
  platform?: 'instagram' | 'tiktok' | 'facebook';
  industry?: IndustryType;
  brandName?: string;
  selectedText?: string;
}

export interface ContentAnalytics {
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
}

export interface GeneratedContentWithAnalytics {
  caption: string;
  hashtags: string[];
  wordCount: number;
  hashtagCount: number;
  analytics: ContentAnalytics;
}

// Platform-specific configurations
const platformConfig = {
  instagram: {
    maxLength: 2200,
    hashtagLimit: 30,
    tips: [
      'Prioritize visual storytelling',
      'Use relevant emojis (max 3)',
      'Ideal length 1-2 sentences',
      'Include location tags when relevant',
      'Use line breaks for readability',
      'Start with a hook',
      'End with a call-to-action'
    ],
    bestPractices: {
      emojiPlacement: 'start',
      lineBreaks: true,
      locationTags: true,
      mentionTags: true,
      storyHighlights: true
    }
  },
  tiktok: {
    maxLength: 300,
    hashtagLimit: 10,
    tips: [
      'Create provocative/curiosity-driven text',
      'Use trending words',
      'Keep it very short',
      'Include sound/music references',
      'Use trending hashtags',
      'Add timestamps for key moments',
      'Include challenge/duet prompts'
    ],
    bestPractices: {
      emojiPlacement: 'end',
      lineBreaks: false,
      soundTags: true,
      challengeTags: true,
      timestampTags: true
    }
  },
  facebook: {
    maxLength: 2000,
    hashtagLimit: 10,
    tips: [
      'Keep it engaging and personal',
      'Include valuable insights',
      'Length can be 2-4 sentences',
      'Share relatable content',
      'Include relevant media',
      'Tag relevant pages/people',
      'End with a call-to-action'
    ],
    bestPractices: {
      emojiPlacement: 'start',
      lineBreaks: true,
      pageTags: true,
      personTags: true,
      mediaLinks: true
    }
  }
} as const;

// Helper functions
function getSystemPrompt(
  style: string,
  language: string,
  platform: keyof typeof platformConfig = 'instagram',
  industry?: keyof typeof industryConfig
): string {
  const basePrompt = `You are a professional ${platform} content writer${
    industry ? ` specializing in ${industry}` : ''
  }.
Generate highly engaging content that aligns with ${platform}'s best practices.
${language === 'id' ? 'Gunakan bahasa Indonesia yang natural.' : 'Use natural English language.'}`;

  const platformTips = platformConfig[platform].tips.join('\n');
  const industryHashtags = industry
    ? `\nRecommended hashtags: ${industryConfig[industry].sampleHashtags.join(', ')}`
    : '';

  return `${basePrompt}
${platformTips}${industryHashtags}
Hashtags: ${platformConfig[platform].hashtagLimit} relevant tags, mix of trending and niche
OUTPUT FORMAT:
[Caption without hashtags]
---
[Space-separated hashtags]`;
}

function optimizeWithEmojis(
  text: string,
  industry?: keyof typeof industryConfig
): string {
  if (!industry) return text;

  const emojis = industryConfig[industry].commonEmojis;
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  
  // 50% chance to add emoji at start
  if (Math.random() > 0.5) {
    return `${randomEmoji} ${text}`;
  }
  return text;
}

function optimizeLength(text: string, platform: keyof typeof platformConfig): string {
  const limit = platformConfig[platform].maxLength;
  
  if (text.length > limit) {
    return `${text.substring(0, limit - 50)}... [continued in comments]`;
  }
  return text;
}

function optimizeForPlatform(
  text: string,
  platform: keyof typeof platformConfig,
  industry?: keyof typeof industryConfig
): string {
  const config = platformConfig[platform];
  let optimizedText = text;

  // Apply platform-specific formatting
  if (config.bestPractices.lineBreaks) {
    optimizedText = optimizedText.replace(/\. /g, '.\n\n');
  }

  // Apply emoji placement based on platform
  if (industry) {
    const emojis = industryConfig[industry].commonEmojis;
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    switch (config.bestPractices.emojiPlacement) {
      case 'start':
        optimizedText = `${randomEmoji} ${optimizedText}`;
        break;
      case 'end':
        optimizedText = `${optimizedText} ${randomEmoji}`;
        break;
    }
  }

  // Add platform-specific tags
  if (platform === 'instagram' && 'locationTags' in config.bestPractices) {
    optimizedText += '\n\n📍 [Add location]';
  }

  if (platform === 'tiktok' && 'soundTags' in config.bestPractices) {
    optimizedText += '\n\n🎵 [Add sound]';
  }

  if (platform === 'facebook' && 'pageTags' in config.bestPractices) {
    optimizedText += '\n\n🏢 [Tag relevant companies]';
  }

  return optimizedText;
}

async function checkContentSafety(text: string): Promise<boolean> {
  try {
    // Only check for the most critical spam patterns
    const spamPatterns = [
      /(?:bitcoin|crypto|currency|lottery|raffle|giveaway|contest|competition)/i
    ];

    // Check for spam patterns
    const hasSpamPattern = spamPatterns.some(pattern => pattern.test(text));
    if (hasSpamPattern) {
      console.warn('Content flagged for spam patterns');
      return false;
    }

    // Check for excessive punctuation
    const excessivePunctuation = /[!?]{5,}|[.]{5,}/.test(text);
    if (excessivePunctuation) {
      console.warn('Content flagged for excessive punctuation');
      return false;
    }

    // Check for all caps (only if more than 50% of the text is caps)
    const words = text.split(/\s+/);
    const allCapsWords = words.filter(word => /^[A-Z\s!?.,]+$/.test(word));
    if (allCapsWords.length > words.length * 0.5) {
      console.warn('Content flagged for excessive caps');
      return false;
    }

    // Check for excessive emojis (increased limit)
    const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 10) {
      console.warn('Content flagged for excessive emojis');
      return false;
    }

    // OpenAI moderation check
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ input: text })
    });
    
    const data = await response.json();
    return !data.results[0].flagged;
  } catch (error) {
    console.warn('Content moderation failed:', error);
    return true; // Fallback if moderation fails
  }
}

function cleanCaptionFromHashtags(text: string): string {
  // Remove hashtags and extra whitespace at the end
  return text.replace(/#\w+/g, '').trim();
}

// Main generation function
export async function enhancedGenerate({
  prompt,
  style,
  language,
  platform = 'instagram',
  industry,
  brandName,
  selectedText
}: EnhancedOptions): Promise<GeneratedContentWithAnalytics> {
  // 1. Generate system prompt
  const systemPrompt = getSystemPrompt(
    style,
    language,
    platform as keyof typeof platformConfig,
    industry as keyof typeof industryConfig
  );

  // 2. Prepare user prompt with context
  const userPrompt = selectedText
    ? `Original: "${selectedText}"\nTask: ${prompt}`
    : prompt;

  // 3. Add brand context if provided
  const brandContext = brandName ? `\nBrand: ${brandName}` : '';

  // 4. Generate content
  const { caption: rawCaption, hashtags } = await openaiGenerate({
    prompt: `${systemPrompt}\n\n${userPrompt}${brandContext}`,
    style,
    language,
    platform,
    industry,
    brandName,
    selectedText
  });

  // 4.5 Clean caption from any hashtags
  const caption = cleanCaptionFromHashtags(rawCaption);

  // 5. Optimize content
  let optimizedCaption = optimizeWithEmojis(
    caption,
    industry as keyof typeof industryConfig
  );
  optimizedCaption = optimizeLength(optimizedCaption, platform as keyof typeof platformConfig);
  optimizedCaption = optimizeForPlatform(optimizedCaption, platform as keyof typeof platformConfig, industry as keyof typeof industryConfig);

  // 6. Safety check
  const isSafe = await checkContentSafety(optimizedCaption);
  if (!isSafe) {
    throw new Error('Generated content flagged as inappropriate');
  }

  // 7. Generate analytics
  const analytics = calculateAnalytics(
    { caption: optimizedCaption, hashtags },
    platform
  );

  return {
    caption: optimizedCaption,
    hashtags: hashtags.slice(0, platformConfig[platform as keyof typeof platformConfig].hashtagLimit),
    wordCount: optimizedCaption.split(/\s+/).length,
    hashtagCount: hashtags.length,
    analytics
  };
} 