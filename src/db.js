// db.js

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

// Define the structure of your database file
const defaultData = { strings: [] };

// Configure lowdb to read and write to db.json
const adapter = new JSONFile('db.json');
const db = new Low(adapter, defaultData);

// Function to ensure the database is loaded before any operation
export async function setupDb() {
    await db.read();
    // If the file was empty, initialize with default data
    db.data = db.data || defaultData;
}

// Export the db instance for use in controllers
export const lowDb = db;