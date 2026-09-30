import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'skybank.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize schema if the database was just created
const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema);

export default db;
