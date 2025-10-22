import { lowDb } from "../db.js"; // Import the LowDB instance
import { analyzeString } from "../utils/analyzer.js";

/** ------------------------
 * POST /strings
 * -----------------------*/
async function createString(req, res) {
	const { value } = req.body;
	if (!value || typeof value !== "string")
		return res.status(400).json({ error: "Invalid or missing 'value'" });

	const properties = analyzeString(value);
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

	try {
		// Read the data and check for existence
		await lowDb.read();
		const exists = lowDb.data.strings.find(
			(r) => r.id === newRecord.id
		);

		if (exists)
			return res.status(409).json({ error: "String already exists" });

		// Add the new record and write to file
		lowDb.data.strings.push(newRecord);
		await lowDb.write();

		res.status(201).json({
			id: newRecord.id,
			value: newRecord.value,
			properties,
			created_at: newRecord.created_at,
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

/** ------------------------
 * GET /strings/:value
 * -----------------------*/
async function getString(req, res) {
	const { value } = req.params;
	try {
		// Calculate hash to find the record
		const hash = analyzeString(value).sha256_hash;

		await lowDb.read();
		const record = lowDb.data.strings.find((r) => r.id === hash);

		if (!record)
			return res.status(404).json({ error: "String not found" });

		res.status(200).json({
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
		res.status(500).json({ error: err.message });
	}
}

/** ------------------------
 * GET /strings (filtering)
 * -----------------------*/
async function getAllStrings(req, res) {
	const {
		is_palindrome,
		min_length,
		max_length,
		word_count,
		contains_character,
	} = req.query;

	try {
		await lowDb.read();
		let records = lowDb.data.strings;

		// --- Filtering Logic ---

		// 1. Filter by is_palindrome
		if (is_palindrome !== undefined) {
			const isPalindromeBool = is_palindrome === "true";
			records = records.filter((r) => r.is_palindrome === isPalindromeBool);
		}

		// 2. Filter by min_length
		if (min_length) {
			const minLen = parseInt(min_length);
			records = records.filter((r) => r.length >= minLen);
		}

		// 3. Filter by max_length
		if (max_length) {
			const maxLen = parseInt(max_length);
			records = records.filter((r) => r.length <= maxLen);
		}

		// 4. Filter by word_count
		if (word_count) {
			const count = parseInt(word_count);
			records = records.filter((r) => r.word_count === count);
		}

		// 5. Filter by contains_character
		if (contains_character) {
			const char = contains_character.toLowerCase();
			records = records.filter((r) =>
				r.value.toLowerCase().includes(char)
			);
		}

		// --- Response Formatting ---

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

		res.status(200).json({
			data: response,
			count: response.length,
			filters_applied: req.query, // Return the raw query parameters
		});
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
}

/** ------------------------
 * GET /strings/filter-by-natural-language
 * -----------------------*/
async function naturalLanguageFilter(req, res) {
	const { query } = req.query;
	if (!query)
		return res.status(400).json({ error: "Missing 'query' parameter" });

	let filters = {};
	const q = query.toLowerCase();

	// --- Natural Language Parsing ---

	// Palindrome
	if (q.includes("palindromic") || q.includes("palindrome")) filters.is_palindrome = "true";

	// Word Count
	if (q.includes("single word")) filters.word_count = "1";
	
	// Min Length (longer than X)
	const longerMatch = q.match(/longer than (\d+)/);
	if (longerMatch) {
		filters.min_length = (parseInt(longerMatch[1]) + 1).toString();
	}
	
	// Max Length (shorter than X)
	const shorterMatch = q.match(/shorter than (\d+)/);
	if (shorterMatch) {
		filters.max_length = (parseInt(shorterMatch[1]) - 1).toString();
	}
	
	// Contains Character
	const containsMatch = q.match(/contain(?:s)? the letter (\w)/);
	if (containsMatch) {
		filters.contains_character = containsMatch[1];
	}

	if (Object.keys(filters).length === 0)
		return res
			.status(400)
			.json({ error: "Unable to parse natural language query" });
            
    // --- Reuse main filter logic ---
    // Note: To reuse getAllStrings efficiently, we will call it directly 
    // but with the parsed filters assigned to req.query.

    // A simple, explicit filter here is cleaner than mocking the request/response.
    
    // We can call getAllStrings with the updated query object
    try {
        // Run the filtering logic directly from getAllStrings
        // This is a direct copy of the filtering logic from getAllStrings, ensuring consistency
        await lowDb.read();
        let records = lowDb.data.strings;

        if (filters.is_palindrome !== undefined) {
            const isPalindromeBool = filters.is_palindrome === "true";
            records = records.filter((r) => r.is_palindrome === isPalindromeBool);
        }

        if (filters.word_count) {
            const count = parseInt(filters.word_count);
            records = records.filter((r) => r.word_count === count);
        }

        if (filters.min_length) {
            const minLen = parseInt(filters.min_length);
            records = records.filter((r) => r.length >= minLen);
        }

        if (filters.max_length) {
            const maxLen = parseInt(filters.max_length);
            records = records.filter((r) => r.length <= maxLen);
        }

        if (filters.contains_character) {
            const char = filters.contains_character.toLowerCase();
            records = records.filter((r) =>
                r.value.toLowerCase().includes(char)
            );
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


        res.status(200).json({
            data: response,
            count: response.length,
            interpreted_query: {
                original: query,
                parsed_filters: filters,
            },
        });

    } catch (err) {
        res.status(422).json({ error: err.message });
    }
}

/** ------------------------
 * DELETE /strings/:value
 * -----------------------*/
async function deleteString(req, res) {
	const { value } = req.params;
	try {
		const hash = analyzeString(value).sha256_hash;

		await lowDb.read();
		const initialCount = lowDb.data.strings.length;
		
		// Filter out the record to be deleted
		lowDb.data.strings = lowDb.data.strings.filter((r) => r.id !== hash);
		const finalCount = lowDb.data.strings.length;


		if (initialCount === finalCount)
			return res.status(404).json({ error: "String not found" });

		// Write the updated list back to the file
		await lowDb.write();
		
		res.status(204).send();
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
}

export { createString, getString, getAllStrings, naturalLanguageFilter, deleteString };