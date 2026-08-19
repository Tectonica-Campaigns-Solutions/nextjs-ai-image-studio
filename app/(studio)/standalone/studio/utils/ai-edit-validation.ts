import { AI_EDIT_RANGES } from "../constants/editor-constants";

const QUOTED_TEXT_REGEX = /["']([^"']+)["']/;

// Matches a verb (add/change/write/etc., English or Spanish) followed within a
// short span of non-quote words by "text"/"texto", regardless of the article
// or pronoun used in between (e.g. "add this text", "change the text", "agregar el texto").
const MENTIONS_TEXT_EDIT_REGEX =
  /\b(add|insert|write|change|edit|modify|replace|update|set|put|agregar|añadir|anadir|insertar|escribir|cambiar|editar|modificar|reemplazar|actualizar|poner)\b(?:(?!["']).){0,25}?\b(text|texto)\b/i;

/**
 * Detects prompts that ask to add/change text on the image (e.g. Add the text
 * "Happy Birthday John", Change this text to "...") and flags cases where the
 * quoted text exceeds the allowed word count. Returns null when the prompt
 * doesn't mention adding/changing text, or when the text can't be determined
 * (no quoted content), so no restriction applies.
 */
export function getOversizedAddedText(
  prompt: string
): { text: string; wordCount: number } | null {
  const mentionsTextEdit = MENTIONS_TEXT_EDIT_REGEX.test(prompt);
  if (!mentionsTextEdit) return null;

  const match = prompt.match(QUOTED_TEXT_REGEX);
  if (!match) return null;

  const text = match[1].trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount <= AI_EDIT_RANGES.MAX_ADDED_TEXT_WORDS) return null;

  return { text, wordCount };
}
