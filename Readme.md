String Analyzer APIA fast, 
lightweight REST API for analyzing and storing unique strings. It calculates properties like length, word count, and palindrome status, and offers advanced filtering capabilities, including natural language querying.This project uses Express.js for the API and LowDB for simple, file-based persistence.

🚀 Key FeaturesString Analysis: Calculates length, word count, unique characters, character frequency, and SHA-256 hash for every submitted string.
Persistence (LowDB): Uses a file-based JSON database (db.json) for persistence without needing a complex SQL/NoSQL setup.Unique Storage: Stores only unique strings (based on their SHA-256 hash).
Advanced Filtering: Allows filtering by length, palindrome status, word count, and character presence via query parameters.
Natural Language Query: Includes an experimental endpoint (/filter-by-natural-language) to interpret human-readable filter requests (e.g., "all palindromic strings longer than 5").

🛠️ Technology StackBackend: Node.js, Express.jsDatabase: LowDB (File-based JSON)Package Manager: pnpm (or npm/yarn)📦 Setup and InstallationPrerequisitesNode.js (v18 or higher recommended)pnpm (or npm/yarn)

StepsClone the Repository:Bash git clone [(https://github.com/Neke-Chukwu/String-Analyzer-Service.git)]
Install Dependencies:Bashpnpm install
# or npm install
Start the Server:Bash# Assuming your start script runs index.js or server.js
pnpm start
# or for development with nodemon (if configured)
pnpm dev 
The API will run on the port defined in your environment variables (e.g., http://localhost:5000).🌐 API EndpointsThe base URL for all endpoints is typically http://localhost:5000/api/strings (adjust port and path as needed).

1. Create and Analyze a StringEndpoint: POST /stringsDescription: Analyzes a string, calculates its properties, saves it to the database, and returns the analysis.

Request Body (JSON):JSON{
    "value": "madam, i'm adam"
}
Success Response (201 Created):JSON{
  "id": "e3b0c44298fc...",
  "value": "madam, i'm adam",
  "properties": {
    "length": 15,
    "is_palindrome": true,
    "unique_characters": 8,
    "word_count": 3,
    "sha256_hash": "e3b0c44298fc...",
    "character_frequency_map": { /* ... */ }
  },
  "created_at": "2023-10-22T10:00:00.000Z"
}
Error Response (409 Conflict): If the string already exists.

2. Retrieve a Specific StringEndpoint: 
GET /strings/:valueDescription: Analyzes the value in the URL to find its hash and retrieves the stored record.Example: GET /strings/helloSuccess Response (200 OK): Returns the stored record and analysis.
Error Response (404 Not Found): If no record is found for the given string value.

3. Get and Filter All StringsEndpoint: 
GET /stringsDescription: Retrieves all stored strings, filtered by optional query parameters.
Query Parameters:| Parameter | Type | Example | Description || :--- | :--- | :--- | :--- || is_palindrome | boolean | true | Filters for palindromic strings. || min_length | integer | 5 | Filters for strings with length $\ge 5$. || max_length | integer | 10 | Filters for strings with length $\le 10$. || word_count | integer | 2 | Filters for strings with exactly 2 words. || contains_character | string | a | Filters for strings containing the character 'a'. |Example: GET /strings?is_palindrome=true&min_length=5

4. Filter by Natural LanguageEndpoint: 
GET /strings/filter-by-natural-language?query=...Description: Attempts to parse human language into filter parameters.Example Query: GET /strings/filter-by-natural-language?query=show me palindromic strings longer than 10Success Response (200 OK): Returns filtered strings along with the interpreted query.

5. Delete a StringEndpoint: 
DELETE /strings/:valueDescription: Analyzes the value in the URL to find its hash and deletes the corresponding record from the database.Success Response (204 No Content)Error Response (404 Not Found)