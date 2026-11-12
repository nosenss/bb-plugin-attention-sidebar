/**
 * Project avatars: one or two letters from the project name and a stable
 * color from the project id. Pure, so it is unit-tested without a DOM.
 */

const LETTER = /\p{L}/u;
const LEADING_NON_LETTERS = /^[^\p{L}]+/u;
/** Separators between words: `-`, `_`, `.`, and whitespace. */
const SEPARATORS = /[-_.\s]+/u;
/** A lowercase letter or digit followed by an uppercase letter: `smmJokes`. */
const CAMEL_BOUNDARY = /(?<=[\p{Ll}\p{N}])(?=\p{Lu})/u;

function firstLetter(word: string): string | null {
  for (const char of word) {
    if (LETTER.test(char)) return char;
  }
  return null;
}

/**
 * The avatar text for a project: first letters of the first two words, or the
 * first two letters of a one-word name. Leading emoji and other non-letters
 * are skipped; an empty name gives "?" and the personal project gives "Я".
 */
export function projectInitials(
  name: string | null | undefined,
  isPersonal = false,
): string {
  if (isPersonal) return "Я";
  const trimmed = (name ?? "").replace(LEADING_NON_LETTERS, "");
  if (trimmed === "") return "?";

  const words = trimmed
    .split(SEPARATORS)
    .flatMap((part) => part.split(CAMEL_BOUNDARY))
    .filter((word) => firstLetter(word) !== null);

  let initials: string;
  if (words.length >= 2) {
    initials = `${firstLetter(words[0]!)}${firstLetter(words[1]!)}`;
  } else {
    const letters = Array.from(words[0] ?? trimmed).filter((char) =>
      LETTER.test(char),
    );
    initials = letters.slice(0, 2).join("");
  }
  return initials === "" ? "?" : initials.toLocaleUpperCase();
}

/** 32-bit FNV-1a over the string's UTF-16 code units. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Ten hues, each a darker tone for light themes and a lighter one for dark
 * themes. bb sets `color-scheme` on `.light` / `.dark`, so `light-dark()`
 * follows the active theme.
 */
const HUES = [25, 55, 85, 135, 165, 200, 240, 275, 310, 345] as const;
export const AVATAR_PALETTE: readonly string[] = HUES.map(
  (hue) => `light-dark(oklch(50% 0.15 ${hue}), oklch(80% 0.12 ${hue}))`,
);

export function projectColor(projectId: string): string {
  return AVATAR_PALETTE[fnv1a(projectId) % AVATAR_PALETTE.length]!;
}

export interface ProjectAvatarStyle {
  color: string;
  backgroundColor: string;
}

export function projectAvatarStyle(projectId: string): ProjectAvatarStyle {
  const color = projectColor(projectId);
  return {
    color,
    backgroundColor: `color-mix(in oklab, ${color} 22%, transparent)`,
  };
}
