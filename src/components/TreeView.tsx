import Link from "next/link";
import type { TreeNode } from "@/db/queries";

// Composant récursif : un dossier s'affiche lui-même en appelant TreeView
// pour ses enfants, qui font de même, jusqu'aux pages (sans enfants).
export function TreeView({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="space-y-1">
      {nodes.map((node) => (
        <li key={node.id}>
          {node.type === "folder" ? (
            // <details> est repliable nativement, sans JavaScript.
            <details>
              <summary className="cursor-pointer select-none font-mono hover:opacity-70">
                {node.title}
              </summary>
              <div className="ml-2 mt-1 border-l border-foreground/15 pl-3">
                {node.children.length > 0 ? (
                  <TreeView nodes={node.children} />
                ) : (
                  <p className="text-sm text-foreground/40">Vide</p>
                )}
              </div>
            </details>
          ) : (
            <Link
              href={`/page/${node.id}`}
              className="text-foreground/80 hover:text-foreground hover:underline"
            >
              {node.title}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
