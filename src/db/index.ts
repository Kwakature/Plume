import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// DATABASE_PATH permet de pointer vers une base de test sans toucher aux vraies données.
const databasePath = process.env.DATABASE_PATH ?? "data/mes-cours.db";

// Sur un clone neuf, le dossier data/ n'existe pas (il est ignoré par git) :
// SQLite ne le crée pas lui-même, on s'en charge.
mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);

// WAL : lectures et écriture peuvent se faire en même temps.
sqlite.pragma("journal_mode = WAL");
// SQLite n'applique les clés étrangères (et donc la cascade) que si on l'active.
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
