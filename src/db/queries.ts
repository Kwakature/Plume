import { and, asc, eq, sql } from "drizzle-orm";
import { normalizeForSearch } from "../lib/content";
import { db } from "./index";
import { nodes, type Node } from "./schema";

// Un nœud avec ses enfants, pour afficher l'arbre.
export type TreeNode = Node & { children: TreeNode[] };

// Une seule requête SQL, puis l'arbre est assemblé en TypeScript.
// Renvoie les racines (parentId null), chacune avec ses descendants.
export function getTree(): TreeNode[] {
  const rows = db
    .select()
    .from(nodes)
    .orderBy(asc(nodes.position), asc(nodes.id))
    .all();

  // 1re passe : un TreeNode (sans enfants) par ligne, retrouvable par id.
  const byId = new Map<number, TreeNode>();
  for (const row of rows) {
    byId.set(row.id, { ...row, children: [] });
  }

  // 2e passe : chaque nœud est rangé dans les enfants de son parent.
  // Les lignes sont déjà triées, donc les enfants le sont aussi.
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId === null ? undefined : byId.get(node.parentId);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// Un dossier avec son chemin lisible (« Cours / Année 1 »), pour le menu « déplacer ».
export type FolderOption = { id: number; label: string };

export function flattenFolders(
  nodes: TreeNode[],
  prefix = "",
): FolderOption[] {
  return nodes
    .filter((node) => node.type === "folder")
    .flatMap((node) => {
      const label = prefix + node.title;
      return [
        { id: node.id, label },
        ...flattenFolders(node.children, `${label} / `),
      ];
    });
}

export function getFavorites(): Node[] {
  return db
    .select()
    .from(nodes)
    .where(eq(nodes.isFavorite, true))
    .orderBy(asc(nodes.title))
    .all();
}

export function getNode(id: number): Node | undefined {
  return db.select().from(nodes).where(eq(nodes.id, id)).get();
}

export type SearchResult = { id: number; title: string; path: string };

// Recherche dans le titre et le contenu des pages. Tous les mots tapés doivent
// apparaître (dans n'importe quel ordre) ; la casse et les accents sont ignorés.
export function searchPages(query: string, limit = 20): SearchResult[] {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean).slice(0, 8);
  if (terms.length === 0) return [];

  // LIKE utilise % et _ comme jokers : on les neutralise dans ce que tape l'utilisateur.
  const conditions = terms.map((term) => {
    const pattern = `%${term.replace(/[\\%_]/g, "\\$&")}%`;
    return sql`${nodes.searchText} LIKE ${pattern} ESCAPE '\\'`;
  });

  const rows = db
    .select({ id: nodes.id, title: nodes.title, parentId: nodes.parentId })
    .from(nodes)
    .where(and(eq(nodes.type, "page"), ...conditions))
    .all();

  // Les pages dont le titre contient tous les mots passent devant les autres.
  const inTitle = (title: string) => {
    const t = normalizeForSearch(title);
    return terms.every((term) => t.includes(term));
  };
  rows.sort((a, b) => Number(inTitle(b.title)) - Number(inTitle(a.title)));

  // Chemin lisible (« Cours / Année 1 »), construit avec un seul passage sur la table.
  const parents = new Map(
    db
      .select({ id: nodes.id, title: nodes.title, parentId: nodes.parentId })
      .from(nodes)
      .all()
      .map((n) => [n.id, n]),
  );
  const pathOf = (parentId: number | null) => {
    const names: string[] = [];
    for (let cursor = parentId; cursor !== null; ) {
      const parent = parents.get(cursor);
      if (!parent) break;
      names.unshift(parent.title);
      cursor = parent.parentId;
    }
    return names.join(" / ");
  };

  return rows
    .slice(0, limit)
    .map((row) => ({ id: row.id, title: row.title, path: pathOf(row.parentId) }));
}
