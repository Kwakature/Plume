import { connection } from "next/server";
import { strToU8, zipSync } from "fflate";
import { getNode, getTree, type TreeNode } from "@/db/queries";
import { pageToMarkdown, safeName, treeToFiles } from "@/lib/export";

function findInTree(nodes: TreeNode[], id: number): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findInTree(node.children, id);
    if (found) return found;
  }
  return undefined;
}

// Réponse « à télécharger » : le navigateur enregistre le fichier au lieu de l'afficher.
function download(body: BodyInit, filename: string, contentType: string) {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      // filename* accepte les accents et les espaces (RFC 5987).
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

// GET /api/export/12 : une page en Markdown, ou un dossier entier en .zip.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await connection(); // lit la base à chaque requête
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return new Response("Identifiant invalide", { status: 400 });

  const node = getNode(numericId);
  if (!node) return new Response("Introuvable", { status: 404 });

  if (node.type === "page") {
    return download(
      pageToMarkdown(node.title, node.content),
      `${safeName(node.title)}.md`,
      "text/markdown; charset=utf-8",
    );
  }

  const folder = findInTree(getTree(), numericId);
  if (!folder) return new Response("Introuvable", { status: 404 });
  const files = treeToFiles(folder, `${safeName(folder.title)}/`);
  if (Object.keys(files).length === 0) {
    return new Response("Ce dossier ne contient aucune page.", { status: 404 });
  }
  const zip = zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)])));
  return download(new Uint8Array(zip), `${safeName(folder.title)}.zip`, "application/zip");
}
