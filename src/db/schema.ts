import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

// Une seule table en arbre : chaque ligne est un dossier ou une page,
// rattachée à son parent (null pour une racine).
export const nodes = sqliteTable("nodes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // La table se référence elle-même : sans l'annotation AnySQLiteColumn,
  // TypeScript ne peut pas inférer le type de `nodes` (référence circulaire).
  parentId: integer("parent_id").references((): AnySQLiteColumn => nodes.id, {
    onDelete: "cascade",
  }),
  type: text("type", { enum: ["folder", "page"] }).notNull(),
  title: text("title").notNull(),
  // Contenu de la page (JSON Tiptap à partir de l'étape 6).
  content: text("content", { mode: "json" }),
  // Texte brut du titre et du contenu, sans accents ni majuscules, pour la
  // recherche. Recalculé à chaque changement de titre ou de contenu.
  searchText: text("search_text").notNull().default(""),
  position: integer("position").notNull().default(0),
  isFavorite: integer("is_favorite", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Type d'une ligne lue (SELECT) et d'une ligne à insérer (INSERT).
export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
