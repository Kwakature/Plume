import type { TreeNode } from "@/db/queries";
import { toDoc } from "./content";
import { docToMarkdown } from "./markdown";

// Texte Markdown d'une page : son titre, puis son contenu.
export function pageToMarkdown(title: string, content: unknown): string {
  const body = docToMarkdown(toDoc(content));
  return body ? `# ${title}\n\n${body}\n` : `# ${title}\n`;
}

// Nom utilisable pour un fichier ou un dossier (sans / \ : * ? " < > |).
export function safeName(title: string): string {
  const name = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 80)
    .trim();
  return name || "sans titre";
}

// Fichiers d'une archive : un .md par page, rangés dans des dossiers comme dans
// l'arbre. Deux éléments de même nom dans un dossier reçoivent un numéro.
// Les dossiers vides n'apparaissent pas (une archive ne contient que des fichiers).
export function treeToFiles(node: TreeNode, prefix = ""): Record<string, string> {
  const files: Record<string, string> = {};
  const used = new Set<string>();

  const unique = (base: string, extension: string) => {
    let name = base;
    for (let n = 2; used.has(`${name}${extension}`.toLowerCase()); n++) {
      name = `${base} (${n})`;
    }
    used.add(`${name}${extension}`.toLowerCase());
    return name;
  };

  for (const child of node.children) {
    if (child.type === "folder") {
      const folder = unique(safeName(child.title), "");
      Object.assign(files, treeToFiles(child, `${prefix}${folder}/`));
    } else {
      const file = unique(safeName(child.title), ".md");
      files[`${prefix}${file}.md`] = pageToMarkdown(child.title, child.content);
    }
  }
  return files;
}
