import { join } from "node:path";
import { isNull } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { TOOLBOX_TITLE } from "../lib/constants";
import { buildSearchText } from "../lib/content";
import { db } from "./index";
import { nodes } from "./schema";

// Prépare la base au démarrage : migrations, puis racines si la base est neuve.
// Sans effet si tout est déjà en place : on peut l'appeler à chaque démarrage.
export function prepareDatabase() {
  migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
  ensureRoots();
}

// L'interface n'ajoute des éléments que sous une racine : sur une base neuve,
// sans ces deux racines, l'accueil serait vide et inutilisable.
function ensureRoots() {
  const hasRoot = db
    .select({ id: nodes.id })
    .from(nodes)
    .where(isNull(nodes.parentId))
    .limit(1)
    .get();
  if (hasRoot) return;

  db.insert(nodes)
    .values(
      ["Cours", TOOLBOX_TITLE].map((title, position) => ({
        type: "folder" as const,
        title,
        position,
        searchText: buildSearchText(title, null),
      })),
    )
    .run();
}
