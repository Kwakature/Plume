import { db } from "./index";
import { nodes, type NewNode } from "./schema";
import { buildSearchText } from "../lib/content";

// Insère une ligne et renvoie son id, pour pouvoir y rattacher des enfants.
function insert(node: NewNode): number {
  const [row] = db
    .insert(nodes)
    .values({ ...node, searchText: buildSearchText(node.title, node.content) })
    .returning({ id: nodes.id }).all();
  return row.id;
}

function seed() {
  // Idempotent : si la table contient déjà quelque chose, on ne touche à rien.
  const existing = db.select({ id: nodes.id }).from(nodes).limit(1).all();
  if (existing.length > 0) {
    console.log("Données déjà présentes, rien à faire.");
    return;
  }

  // Transaction : soit tout est inséré, soit rien.
  db.transaction(() => {
    const cours = insert({ type: "folder", title: "Cours" });
    const outils = insert({ type: "folder", title: "Boîte à outils", position: 1 });

    const annee1 = insert({ type: "folder", title: "Année 1", parentId: cours });
    const algo = insert({ type: "folder", title: "Algorithmique", parentId: annee1 });
    insert({ type: "page", title: "Introduction", parentId: algo });

    insert({ type: "page", title: "Commandes SQL", parentId: outils });
  });

  console.log("Données de test insérées.");
}

seed();
