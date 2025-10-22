import crypto from "node:crypto"

function analyzeString(value) {
    const clean = value.trim();
    const length = clean.length;
    const is_palindrome = clean.toLowerCase() === clean.toLowerCase().split('').reverse().join('');
    const unique_characters = new Set(clean).size;
    const word_count = clean.split(/\s+/).filter(Boolean).length;
    const sha256_hash = crypto.createHash('sha256').update(clean).digest('hex');
    const charMap = {};
    for (let c of clean) charMap[c] = (charMap[c] || 0) + 1;

    return {
        length,
        is_palindrome,
        unique_characters,
        word_count,
        sha256_hash,
        character_frequency_map: charMap
    };
}

export { analyzeString };