// utils/analyzer.js
import crypto from "crypto";

/**
 * analyzeString(value: string) => properties object
 * - ensures palindrome check is case-insensitive
 * - builds character_frequency_map in lowercase keys (consistent)
 */
export function analyzeString(value) {
  if (typeof value !== "string") throw new TypeError("value must be a string");

  const cleaned = value.trim();
  const length = cleaned.length;

  // palindrome check: ignore case, preserve spaces (task didn't instruct to strip spaces)
  const normalized = cleaned.toLowerCase();
  const reversed = normalized.split("").reverse().join("");
  const is_palindrome = normalized === reversed;

  // words: split on whitespace, filter empties
  const word_count = cleaned.split(/\s+/).filter(Boolean).length;

  // unique characters (case-insensitive)
  const unique_characters = new Set(normalized).size;

  // sha256 hash of the original cleaned string (not normalized) to match expectations
  const sha256_hash = crypto.createHash("sha256").update(cleaned).digest("hex");

  // frequency map: use lowercase keys
  const character_frequency_map = {};
  for (const c of cleaned) {
    const key = c.toLowerCase();
    character_frequency_map[key] = (character_frequency_map[key] || 0) + 1;
  }

  return {
    length,
    is_palindrome,
    unique_characters,
    word_count,
    sha256_hash,
    character_frequency_map,
  };
}
