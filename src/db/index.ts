import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("data/mes-cours.db");

// WAL : lectures et écriture peuvent se faire en même temps.
sqlite.pragma("journal_mode = WAL");
// SQLite n'applique les clés étrangères (et donc la cascade) que si on l'active.
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
