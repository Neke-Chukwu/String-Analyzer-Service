// controllers/stringController.js
import { lowDb } from "../db.js";
import { analyzeString } from "../utils/analyzer.js";

/**
 * Helper to ensure db loaded
 */
async function loadDb() {
  await lowDb.read();
  lowDb.data = lowDb.data || { strings: [] };
}

/** ------------------------
 * POST /strings
 * -----------------------*/
export async function createString(req, res) {
  const { value } = req.body;

  // Missing value
  if (value === undefined)
    return res.status(400).json({ error: "Missing 'value' field" });

  // Invalid type
  if (typeof value !== "string")
    return res.status(422).json({ error: "'value' must be a string" });

  // Value empty string is allowed if you want; treat as valid string here
  try {
    const properties = analyzeString(value);

    await loadDb();

    // Check duplicate by hash
    const exists = lowDb.data.strings.find((r) => r.id === properties.sha256_hash);
    if (exists) return res.status(409).json({ error: "String already exists" });

    const newRecord = {
      id: properties.sha256_hash,
      value,
      length: properties.length,
      is_palindrome: properties.is_palindrome,
      unique_characters: properties.unique_characters,
      word_count: properties.word_count,
      character_frequency_map: properties.character_frequency_map,
      created_at: new Date().toISOString(),
    };

    lowDb.data.strings.push(newRecord);
    await lowDb.write();

    // Return exactly the expected shape
    return res.status(201).json({
      id: newRecord.id,
      value: newRecord.value,
      properties: {
        length: newRecord.length,
        is_palindrome: newRecord.is_palindrome,
        unique_characters: newRecord.unique_characters,
        word_count: newRecord.word_count,
        sha256_hash: newRecord.id,
        character_frequency_map: newRecord.character_frequency_map,
      },
      created_at: newRecord.created_at,
    });
  } catch (err) {
    console.error("createString error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/** ------------------------
 * GET /strings/:value
 * -----------------------*/
export async function getString(req, res) {
  const { value } = req.params;
  if (value === undefined) return res.status(400).json({ error: "Missing param 'value'" });

  try {
    const properties = analyzeString(value);
    await loadDb();

    const record = lowDb.data.strings.find((r) => r.id === properties.sha256_hash);
    if (!record) return res.status(404).json({ error: "String not found" });

    return res.status(200).json({
      id: record.id,
      value: record.value,
      properties: {
        length: record.length,
        is_palindrome: record.is_palindrome,
        unique_characters: record.unique_characters,
        word_count: record.word_count,
        sha256_hash: record.id,
        character_frequency_map: record.character_frequency_map,
      },
      created_at: record.created_at,
    });
  } catch (err) {
    console.error("getString error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/** ------------------------
 * GET /strings (filtering)
 * -----------------------*/
export async function getAllStrings(req, res) {
  const {
    is_palindrome,
    min_length,
    max_length,
    word_count,
    contains_character,
  } = req.query;

  try {
    await loadDb();
    let records = [...lowDb.data.strings]; // shallow copy

    // is_palindrome filter: accept true/false strings only
    if (is_palindrome !== undefined) {
      if (is_palindrome !== "true" && is_palindrome !== "false") {
        return res.status(400).json({ error: "is_palindrome must be 'true' or 'false'" });
      }
      const boolVal = is_palindrome === "true";
      records = records.filter((r) => r.is_palindrome === boolVal);
    }

    // min_length
    if (min_length !== undefined) {
      const n = parseInt(min_length, 10);
      if (Number.isNaN(n)) return res.status(400).json({ error: "min_length must be an integer" });
      records = records.filter((r) => r.length >= n);
    }

    // max_length
    if (max_length !== undefined) {
      const n = parseInt(max_length, 10);
      if (Number.isNaN(n)) return res.status(400).json({ error: "max_length must be an integer" });
      records = records.filter((r) => r.length <= n);
    }

    // word_count
    if (word_count !== undefined) {
      const n = parseInt(word_count, 10);
      if (Number.isNaN(n)) return res.status(400).json({ error: "word_count must be an integer" });
      records = records.filter((r) => r.word_count === n);
    }

    // contains_character: string of length 1 (but accept longer and search substring)
    if (contains_character !== undefined) {
      if (typeof contains_character !== "string" || contains_character.length === 0) {
        return res.status(400).json({ error: "contains_character must be a non-empty string" });
      }
      const char = contains_character.toLowerCase();
      records = records.filter((r) => r.value.toLowerCase().includes(char));
    }

    const response = records.map((r) => ({
      id: r.id,
      value: r.value,
      properties: {
        length: r.length,
        is_palindrome: r.is_palindrome,
        unique_characters: r.unique_characters,
        word_count: r.word_count,
        sha256_hash: r.id,
        character_frequency_map: r.character_frequency_map,
      },
      created_at: r.created_at,
    }));

    return res.status(200).json({
      data: response,
      count: response.length,
      filters_applied: {
        is_palindrome: is_palindrome === undefined ? undefined : (is_palindrome === "true"),
        min_length: min_length === undefined ? undefined : parseInt(min_length, 10),
        max_length: max_length === undefined ? undefined : parseInt(max_length, 10),
        word_count: word_count === undefined ? undefined : parseInt(word_count, 10),
        contains_character: contains_character === undefined ? undefined : contains_character,
      },
    });
  } catch (err) {
    console.error("getAllStrings error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/** ------------------------
 * GET /strings/filter-by-natural-language?query=...
 * -----------------------*/
export async function naturalLanguageFilter(req, res) {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Missing 'query' parameter" });

  try {
    const q = query.toLowerCase();

    const filters = {};

    // Palindrome detection
    if (q.includes("palindromic") || q.includes("palindrome")) filters.is_palindrome = true;

    // single word / one word
    if (q.includes("single word") || q.includes("one word") || q.includes("single-word")) filters.word_count = 1;

    // longer than N (we interpret "longer than 10 characters" => min_length = N+1)
    {
      const m = q.match(/longer than (\d+)/);
      if (m) filters.min_length = parseInt(m[1], 10) + 1;
    }

    // strings longer than 10 characters (alternate phrasing)
    {
      const m = q.match(/longer than (\d+) characters/);
      if (m) filters.min_length = parseInt(m[1], 10) + 1;
    }

    // shorter than N (max_length = N-1)
    {
      const m = q.match(/shorter than (\d+)/);
      if (m) filters.max_length = parseInt(m[1], 10) - 1;
    }

    // contains the letter X
    {
      const m = q.match(/contain(?:s|ing)? the letter (\w)/);
      if (m) filters.contains_character = m[1];
    }

    // strings containing the letter z (alternative phrasing)
    {
      const m = q.match(/containing the letter (\w)/);
      if (m) filters.contains_character = m[1];
    }

    if (Object.keys(filters).length === 0) {
      return res.status(400).json({ error: "Unable to parse natural language query" });
    }

    // Now run the same filtering logic as getAllStrings, but on LowDB
    await loadDb();
    let records = [...lowDb.data.strings];

    if (filters.is_palindrome !== undefined) records = records.filter((r) => r.is_palindrome === Boolean(filters.is_palindrome));
    if (filters.word_count !== undefined) records = records.filter((r) => r.word_count === filters.word_count);
    if (filters.min_length !== undefined) records = records.filter((r) => r.length >= filters.min_length);
    if (filters.max_length !== undefined) records = records.filter((r) => r.length <= filters.max_length);
    if (filters.contains_character !== undefined) {
      const char = filters.contains_character.toLowerCase();
      records = records.filter((r) => r.value.toLowerCase().includes(char));
    }

    const response = records.map((r) => ({
      id: r.id,
      value: r.value,
      properties: {
        length: r.length,
        is_palindrome: r.is_palindrome,
        unique_characters: r.unique_characters,
        word_count: r.word_count,
        sha256_hash: r.id,
        character_frequency_map: r.character_frequency_map,
      },
      created_at: r.created_at,
    }));

    // Ensure parsed_filters are typed correctly (booleans/ints)
    const typedFilters = {};
    if (filters.is_palindrome !== undefined) typedFilters.is_palindrome = Boolean(filters.is_palindrome);
    if (filters.word_count !== undefined) typedFilters.word_count = parseInt(filters.word_count, 10);
    if (filters.min_length !== undefined) typedFilters.min_length = parseInt(filters.min_length, 10);
    if (filters.max_length !== undefined) typedFilters.max_length = parseInt(filters.max_length, 10);
    if (filters.contains_character !== undefined) typedFilters.contains_character = filters.contains_character;

    return res.status(200).json({
      data: response,
      count: response.length,
      interpreted_query: {
        original: query,
        parsed_filters: typedFilters,
      },
    });
  } catch (err) {
    console.error("naturalLanguageFilter error:", err);
    return res.status(422).json({ error: "Unable to process natural language query" });
  }
}

/** ------------------------
 * DELETE /strings/:value
 * -----------------------*/
export async function deleteString(req, res) {
  const { value } = req.params;
  if (value === undefined) return res.status(400).json({ error: "Missing param 'value'" });

  try {
    const properties = analyzeString(value);
    await loadDb();

    const initialLength = lowDb.data.strings.length;
    lowDb.data.strings = lowDb.data.strings.filter((r) => r.id !== properties.sha256_hash);

    if (lowDb.data.strings.length === initialLength) {
      return res.status(404).json({ error: "String not found" });
    }

    await lowDb.write();
    // 204 No Content (empty body)
    return res.status(204).send();
  } catch (err) {
    console.error("deleteString error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
