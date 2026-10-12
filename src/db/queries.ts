import { asc, eq } from "drizzle-orm";
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
