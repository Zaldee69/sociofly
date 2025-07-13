import OpenAI from "openai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize OpenAI client only when needed to avoid build-time execution
function getOpenAIClient(): OpenAI {
  // Validate OpenAI API key
  if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key is not configured. Please add NEXT_PUBLIC_OPENAI_API_KEY to your .env.local file."
    );
  }

  // Validate API key format
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey.startsWith("sk-") || apiKey.length < 40) {
    throw new Error(
      'Invalid OpenAI API key format. The key should start with "sk-" and be at least 40 characters long.'
    );
  }

  return new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
    baseURL: "https://api.openai.com/v1",
  });
}

// Initialize rate limiter only when needed to avoid build-time execution
function getRateLimiter(): Ratelimit {
  // Check if Upstash Redis credentials are configured
  if (process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL && process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN) {
    try {
      return new Ratelimit({
        redis: new Redis({
          url: process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL,
          token: process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN,
        }),
        limiter: Ratelimit.slidingWindow(10, "1 m"),
      });
    } catch (error) {
      console.error("Failed to initialize rate limiter:", error);
      // Fallback to a no-op rate limiter
      return {
        limit: async () => ({ success: true }),
      } as unknown as Ratelimit;
    }
  } else {
    console.warn("Upstash Redis credentials not found, rate limiting disabled");
    // Use no-op rate limiter when credentials are not configured
    return {
      limit: async () => ({ success: true }),
    } as unknown as Ratelimit;
  }
}

interface GenerateContentOptions {
  prompt: string;
  selectedText?: string;
  style?: "formal" | "casual" | "promotional";
  language?: "id" | "en";
  platform?: "instagram" | "tiktok" | "facebook";
  industry?: string;
  brandName?: string;
  onStreamingContent?: (content: string) => void;
}


export async function generateContent(options: GenerateContentOptions): Promise<{ caption: string; hashtags: string[] }> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a social media content expert. Generate engaging content that is natural and authentic.
Format your response exactly like this:
CAPTION:
[Your caption here without any hashtags]

HASHTAGS:
[Your hashtags here, one per line starting with #]`
        },
        {
          role: "user",
          content: options.prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Parse the response
    const captionMatch = content.match(/CAPTION:\n([\s\S]*?)\n\nHASHTAGS:/);
    const hashtagsMatch = content.match(/HASHTAGS:\n([\s\S]*?)$/);

    const caption = captionMatch ? captionMatch[1].trim() : '';
    const hashtags = hashtagsMatch 
      ? hashtagsMatch[1]
          .trim()
          .split('\n')
          .map(tag => tag.trim())
          .filter(tag => tag.startsWith('#'))
      : [];

    return {
      caption,
      hashtags
    };
  } catch (error: any) {
    console.error('Error generating content:', error);
    throw new Error(error.message || 'Failed to generate content');
  }
}
