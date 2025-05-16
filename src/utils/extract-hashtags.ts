/**
 * Extracts hashtags from a given text.
 * Supports both standard hashtags (#example) and categorized hashtags (category:example)
 *
 * @param text The text to extract hashtags from
 * @returns An array of extracted hashtags
 */
export function extractHashtags(text: string): string[] {
  if (!text) return [];

  const hashtagsSet = new Set<string>();

  // Match standard hashtags (#example)
  const standardHashtagRegex = /#([a-zA-Z0-9_]+)/g;
  let match;

  while ((match = standardHashtagRegex.exec(text)) !== null) {
    if (match[1] && match[1].length > 0) {
      hashtagsSet.add(match[1].toLowerCase());
    }
  }

  // Match categorized hashtags (category:example)
  const categorizedHashtagRegex = /\b([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)\b/g;

  while ((match = categorizedHashtagRegex.exec(text)) !== null) {
    if (match[1] && match[2] && match[1].length > 0 && match[2].length > 0) {
      hashtagsSet.add(`${match[1].toLowerCase()}:${match[2].toLowerCase()}`);
    }
  }

  return Array.from(hashtagsSet);
}
