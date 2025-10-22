// db.js
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const defaultData = { strings: [] };
const adapter = new JSONFile("db.json");
const lowDb = new Low(adapter, defaultData);

export async function setupDb() {
  await lowDb.read();
  lowDb.data = lowDb.data || defaultData;
}

export { lowDb };
