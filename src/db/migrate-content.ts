// Remet à niveau le contenu des pages déjà en base :
//  - convertit le texte brut (étape 5) en documents JSON Tiptap ;
//  - recalcule la colonne search_text (recherche, étape 8) pour tous les éléments.
// Idempotent : on peut le relancer sans risque.
//   docker compose exec web npx tsx src/db/migrate-content.ts
import { eq } from "drizzle-orm";
import { buildSearchText, plainTextToDoc } from "../lib/content";
import { db } from "./index";
import { nodes } from "./schema";

const rows = db
  .select({ id: nodes.id, title: nodes.title, content: nodes.content })
  .from(nodes)
  .all();

let converted = 0;
for (const row of rows) {
  const isPlainText = typeof row.content === "string";
  const content = isPlainText ? plainTextToDoc(row.content as string) : row.content;
  if (isPlainText) converted++;
  db.update(nodes)
    .set({
      ...(isPlainText ? { content } : {}),
      searchText: buildSearchText(row.title, content),
    })
    .where(eq(nodes.id, row.id))
    .run();
}

console.log(`${converted} page(s) convertie(s), ${rows.length} élément(s) indexé(s).`);
