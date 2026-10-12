// Convertit en base les pages dont le contenu est encore du texte brut
// (étape 5) en documents JSON Tiptap. Idempotent : les pages déjà converties
// ou vides sont ignorées.
//   docker compose exec web npx tsx src/db/migrate-content.ts
import { eq } from "drizzle-orm";
import { plainTextToDoc } from "../lib/content";
import { db } from "./index";
import { nodes } from "./schema";

const rows = db.select({ id: nodes.id, content: nodes.content }).from(nodes).all();

let converted = 0;
for (const row of rows) {
  if (typeof row.content !== "string") continue;
  db.update(nodes)
    .set({ content: plainTextToDoc(row.content) })
    .where(eq(nodes.id, row.id))
    .run();
  converted++;
}

console.log(`${converted} page(s) convertie(s).`);
