"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createNode,
  deleteNode,
  moveNode,
  renameNode,
  reorderNode,
  setPageContent,
  toggleFavorite,
} from "@/db/mutations";

// Schémas de validation : tout ce qui arrive du navigateur est non fiable
// (une server action peut être appelée par n'importe quelle requête POST).
const idSchema = z.number().int().positive();
const titleSchema = z
  .string()
  .trim()
  .min(1, "Le titre ne peut pas être vide.")
  .max(120, "Le titre est trop long (120 caractères maximum).");

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Valide l'entrée, exécute l'opération, rafraîchit l'affichage.
// Toute erreur (validation ou règle métier) devient { ok: false, error }.
function run<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  operation: (data: z.output<S>) => T,
): ActionResult<T> {
  try {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    const data = operation(parsed.data);
    // Les pages relisent la base à chaque requête : on demande simplement
    // à Next.js de rafraîchir ce que le navigateur affiche.
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return { ok: false, error: message };
  }
}

export async function createNodeAction(input: {
  parentId: number;
  type: "folder" | "page";
  title: string;
}) {
  return run(
    z.object({
      parentId: idSchema,
      type: z.enum(["folder", "page"]),
      title: titleSchema,
    }),
    input,
    (data) => createNode(data),
  );
}

export async function renameNodeAction(id: number, title: string) {
  return run(z.object({ id: idSchema, title: titleSchema }), { id, title }, (d) =>
    renameNode(d.id, d.title),
  );
}

export async function deleteNodeAction(id: number) {
  return run(idSchema, id, (nodeId) => deleteNode(nodeId));
}

export async function toggleFavoriteAction(id: number) {
  return run(idSchema, id, (nodeId) => toggleFavorite(nodeId));
}

export async function moveNodeAction(id: number, newParentId: number) {
  return run(
    z.object({ id: idSchema, newParentId: idSchema }),
    { id, newParentId },
    (d) => moveNode(d.id, d.newParentId),
  );
}

export async function reorderNodeAction(id: number, direction: "up" | "down") {
  return run(
    z.object({ id: idSchema, direction: z.enum(["up", "down"]) }),
    { id, direction },
    (d) => reorderNode(d.id, d.direction),
  );
}

// Un document Tiptap : un objet { type: "doc", content: [...] }.
// On vérifie la racine et la taille, pas chaque nœud (Tiptap s'en charge).
const docSchema = z
  .looseObject({ type: z.literal("doc") })
  .refine((doc) => JSON.stringify(doc).length <= 2_000_000, "Le texte est trop long.");

export async function saveContentAction(id: number, content: unknown) {
  return run(z.object({ id: idSchema, content: docSchema }), { id, content }, (d) =>
    setPageContent(d.id, d.content),
  );
}
