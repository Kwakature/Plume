import type { JSONContent } from "@tiptap/react";

// Document Tiptap vide : un seul paragraphe vide.
export const emptyDoc: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

// Migration du texte brut (étape 5) vers le JSON Tiptap :
// chaque ligne devient un paragraphe, une ligne vide un paragraphe vide.
export function plainTextToDoc(text: string): JSONContent {
  if (text === "") return emptyDoc;
  return {
    type: "doc",
    content: text.split("\n").map((line) =>
      line === ""
        ? { type: "paragraph" }
        : { type: "paragraph", content: [{ type: "text", text: line }] },
    ),
  };
}

// `content` vient de la base (colonne JSON, donc `unknown`). Selon l'âge de la
// page, c'est : null (jamais écrite), une chaîne (texte brut de l'étape 5)
// ou déjà un document Tiptap.
export function toDoc(content: unknown): JSONContent {
  if (typeof content === "string") return plainTextToDoc(content);
  if (isDoc(content)) return content;
  return emptyDoc;
}

export function isDoc(value: unknown): value is JSONContent {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "doc"
  );
}

// Blocs dont les enfants sont eux-mêmes des blocs : on les sépare par un
// saut de ligne. Les autres (paragraphe, titre, bloc de code) contiennent
// du texte en ligne, qu'on recolle tel quel.
const containerTypes = new Set(["doc", "bulletList", "orderedList", "listItem", "blockquote"]);

// Texte brut d'un document Tiptap (sans mise en forme).
export function docToText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const children = (node.content ?? []).map(docToText);
  return children.join(containerTypes.has(node.type ?? "") ? "\n" : "");
}

// Met un texte sous une forme comparable : minuscules et sans accents,
// pour que « ecole » retrouve « École ».
export function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Texte stocké dans la colonne search_text d'un élément.
export function buildSearchText(title: string, content: unknown): string {
  return normalizeForSearch(`${title}\n${docToText(toDoc(content))}`);
}
