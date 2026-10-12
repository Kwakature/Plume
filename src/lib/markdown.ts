import type { JSONContent } from "@tiptap/react";

// Conversion d'un document Tiptap en Markdown. On ne gère que ce que l'éditeur
// sait produire (titres, listes, citations, blocs de code, gras, italique,
// code, barré) ; un nœud inconnu est rendu par son contenu, sans planter.

export function docToMarkdown(doc: JSONContent): string {
  return children(doc).trim();
}

function children(node: JSONContent): string {
  return (node.content ?? [])
    .map(block)
    .filter((text) => text !== "")
    .join("\n\n");
}

function block(node: JSONContent): string {
  switch (node.type) {
    case "paragraph":
      return escapeLineStart(inline(node));
    case "heading":
      return `${"#".repeat(node.attrs?.level ?? 1)} ${inline(node)}`;
    case "bulletList":
      return list(node, () => "- ");
    case "orderedList": {
      const start: number = node.attrs?.start ?? 1;
      return list(node, (index) => `${start + index}. `);
    }
    case "blockquote":
      return children(node)
        .split("\n")
        .map((line) => (line ? `> ${line}` : ">"))
        .join("\n");
    case "codeBlock":
      return codeBlock(node);
    case "horizontalRule":
      return "---";
    default:
      return children(node);
  }
}

// Une liste : chaque élément commence par sa puce, et ses lignes suivantes
// (paragraphes ou listes imbriquées) sont décalées de la largeur de la puce.
function list(node: JSONContent, marker: (index: number) => string): string {
  return (node.content ?? [])
    .map((item, index) => {
      const bullet = marker(index);
      const lines = (item.content ?? []).map(block).join("\n").split("\n");
      const indent = " ".repeat(bullet.length);
      return bullet + lines.map((line, i) => (i === 0 || !line ? line : indent + line)).join("\n");
    })
    .join("\n");
}

// Un bloc de code est entouré de ``` ; s'il en contient déjà, on allonge la clôture.
function codeBlock(node: JSONContent): string {
  const text = (node.content ?? []).map((child) => child.text ?? "").join("");
  const longestRun = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longestRun + 1);
  return `${fence}${node.attrs?.language ?? ""}\n${text}\n${fence}`;
}

function inline(node: JSONContent): string {
  return (node.content ?? []).map(inlineNode).join("");
}

function inlineNode(node: JSONContent): string {
  if (node.type === "hardBreak") return "  \n";
  if (node.type !== "text") return inline(node);

  const marks = new Set((node.marks ?? []).map((mark) => mark.type));
  let text = node.text ?? "";
  if (marks.has("code")) {
    // Dans du code, rien n'est interprété : pas d'échappement, mais des
    // accents graves plus longs si le texte en contient.
    const ticks = "`".repeat(Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length)) + 1);
    text = `${ticks}${text}${ticks}`;
  } else {
    text = text.replace(/([\\`*_[\]<])/g, "\\$1");
  }
  if (marks.has("strike")) text = `~~${text}~~`;
  if (marks.has("italic")) text = `_${text}_`;
  if (marks.has("bold")) text = `**${text}**`;
  return text;
}

// Un paragraphe qui commencerait par « # », « - », « 1. »… serait lu comme
// un titre ou une liste : on neutralise ce premier caractère.
function escapeLineStart(text: string): string {
  return text.replace(/^(#{1,6} |[-+>] |\d+[.)] |---)/, (start) => `\\${start}`);
}
