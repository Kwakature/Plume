// Données de démonstration pour le développement (le serveur crée déjà les deux
// racines au démarrage) :
//   docker compose exec web npx tsx src/db/seed.ts
import { eq } from "drizzle-orm";
import { TOOLBOX_TITLE } from "../lib/constants";
import { buildSearchText } from "../lib/content";
import { db } from "./index";
import { prepareDatabase } from "./prepare";
import { nodes, type NewNode } from "./schema";

// Insère une ligne et renvoie son id, pour pouvoir y rattacher des enfants.
function insert(node: NewNode): number {
  const [row] = db
    .insert(nodes)
    .values({ ...node, searchText: buildSearchText(node.title, node.content) })
    .returning({ id: nodes.id })
    .all();
  return row.id;
}

function rootId(title: string): number {
  const root = db.select({ id: nodes.id }).from(nodes).where(eq(nodes.title, title)).get();
  if (!root) throw new Error(`Racine « ${title} » introuvable.`);
  return root.id;
}

function seed() {
  prepareDatabase(); // garantit migrations et racines, même sur une base vide
  const cours = rootId("Cours");
  const outils = rootId(TOOLBOX_TITLE);

  // Idempotent : si « Cours » contient déjà quelque chose, on ne touche à rien.
  const existing = db.select({ id: nodes.id }).from(nodes).where(eq(nodes.parentId, cours)).limit(1).all();
  if (existing.length > 0) {
    console.log("Données déjà présentes, rien à faire.");
    return;
  }

  // Transaction : soit tout est inséré, soit rien.
  db.transaction(() => {
    const annee1 = insert({ type: "folder", title: "Année 1", parentId: cours });
    const algo = insert({ type: "folder", title: "Algorithmique", parentId: annee1 });
    insert({ type: "page", title: "Introduction", parentId: algo });
    insert({ type: "page", title: "Commandes SQL", parentId: outils });
  });

  console.log("Données de test insérées.");
}

seed();
