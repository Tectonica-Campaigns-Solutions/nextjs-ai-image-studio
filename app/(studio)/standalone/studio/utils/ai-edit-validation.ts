import {
  AI_EDIT_ADD_TEXT_KEYWORDS,
  AI_EDIT_RANGES,
} from "../constants/editor-constants";

const QUOTED_TEXT_REGEX = /["']([^"']+)["']/;

/**
 * Detects "add text" style prompts (e.g. Add the text "Happy Birthday John")
 * and flags cases where the quoted text to add exceeds the allowed word count.
 * Returns null when the prompt doesn't mention adding text, or when the text
 * to add can't be determined (no quoted content), so no restriction applies.
 */
export function getOversizedAddedText(
  prompt: string
): { text: string; wordCount: number } | null {
  const lowerPrompt = prompt.toLowerCase();
  const mentionsAddingText = AI_EDIT_ADD_TEXT_KEYWORDS.some((keyword) =>
    lowerPrompt.includes(keyword)
  );
  if (!mentionsAddingText) return null;

  const match = prompt.match(QUOTED_TEXT_REGEX);
  if (!match) return null;

  const text = match[1].trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount <= AI_EDIT_RANGES.MAX_ADDED_TEXT_WORDS) return null;

  return { text, wordCount };
}
