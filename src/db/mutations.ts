import { asc, eq, isNull, max } from "drizzle-orm";
import { db } from "./index";
import { nodes } from "./schema";
import { getNode } from "./queries";
import { buildSearchText } from "../lib/content";

// Ces fonctions modifient la base. Quand une règle est violée, elles lèvent
// une Error avec un message en français, affichable tel quel dans l'interface.

function getOrThrow(id: number) {
  const node = getNode(id);
  if (!node) throw new Error("Élément introuvable.");
  return node;
}

// Un dossier cible doit exister et être un dossier (une page n'a pas d'enfants).
function getFolderOrThrow(id: number) {
  const node = getOrThrow(id);
  if (node.type !== "folder") {
    throw new Error("La destination doit être un dossier.");
  }
  return node;
}

// Position à donner à un nouvel enfant pour qu'il arrive en dernier.
function nextPosition(parentId: number): number {
  const row = db
    .select({ last: max(nodes.position) })
    .from(nodes)
    .where(eq(nodes.parentId, parentId))
    .get();
  return (row?.last ?? -1) + 1;
}

export function createNode(input: {
  parentId: number;
  type: "folder" | "page";
  title: string;
}): number {
  getFolderOrThrow(input.parentId);
  const [row] = db
    .insert(nodes)
    .values({
      ...input,
      searchText: buildSearchText(input.title, null),
      position: nextPosition(input.parentId),
    })
    .returning({ id: nodes.id })
    .all();
  return row.id;
}

export function renameNode(id: number, title: string) {
  const node = getOrThrow(id);
  db.update(nodes)
    .set({
      title,
      searchText: buildSearchText(title, node.content),
      updatedAt: new Date(),
    })
    .where(eq(nodes.id, id))
    .run();
}

// La suppression en cascade est faite par SQLite (onDelete: cascade).
export function deleteNode(id: number) {
  const node = getOrThrow(id);
  if (node.parentId === null) {
    throw new Error("Une racine ne peut pas être supprimée.");
  }
  db.delete(nodes).where(eq(nodes.id, id)).run();
}

export function toggleFavorite(id: number) {
  const node = getOrThrow(id);
  db.update(nodes)
    .set({ isFavorite: !node.isFavorite })
    .where(eq(nodes.id, id))
    .run();
}

// Change le parent d'un élément ; il arrive en dernier dans sa nouvelle place.
export function moveNode(id: number, newParentId: number) {
  const node = getOrThrow(id);
  if (node.parentId === null) {
    throw new Error("Une racine ne peut pas être déplacée.");
  }
  getFolderOrThrow(newParentId);

  // Anti-cycle : on remonte de la destination vers la racine. Si on croise
  // l'élément déplacé, la destination est l'un de ses descendants (ou lui-même).
  let cursor: number | null = newParentId;
  while (cursor !== null) {
    if (cursor === id) {
      throw new Error("Impossible de déplacer un dossier dans lui-même.");
    }
    cursor = getNode(cursor)?.parentId ?? null;
  }

  db.update(nodes)
    .set({ parentId: newParentId, position: nextPosition(newParentId) })
    .where(eq(nodes.id, id))
    .run();
}

// Monte ou descend un élément d'un cran parmi ses frères.
export function reorderNode(id: number, direction: "up" | "down") {
  const node = getOrThrow(id);
  const siblings = db
    .select({ id: nodes.id })
    .from(nodes)
    .where(node.parentId === null ? isNull(nodes.parentId) : eq(nodes.parentId, node.parentId))
    .orderBy(asc(nodes.position), asc(nodes.id))
    .all();

  const from = siblings.findIndex((s) => s.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= siblings.length) return; // déjà au bout, rien à faire

  // On échange les deux frères, puis on renumérote 0, 1, 2… pour que les
  // positions restent propres même si elles étaient identiques avant.
  [siblings[from], siblings[to]] = [siblings[to], siblings[from]];
  db.transaction(() => {
    siblings.forEach((s, index) => {
      db.update(nodes).set({ position: index }).where(eq(nodes.id, s.id)).run();
    });
  });
}

// Enregistre le contenu d'une page : un document JSON Tiptap.
export function setPageContent(id: number, content: unknown) {
  const node = getOrThrow(id);
  if (node.type !== "page") {
    throw new Error("Seule une page peut avoir du contenu.");
  }
  db.update(nodes)
    .set({
      content,
      searchText: buildSearchText(node.title, content),
      updatedAt: new Date(),
    })
    .where(eq(nodes.id, id))
    .run();
}
