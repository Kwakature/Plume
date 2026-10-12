"use client";

import { useEffect, useRef, useState } from "react";
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { codeLanguages } from "@/lib/lowlight";

// Copie dans le presse-papiers. navigator.clipboard n'existe qu'en contexte
// sécurisé (https ou localhost) : via le VPN en http, on se rabat sur
// l'ancienne méthode (champ temporaire + execCommand).
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // refusé : on tente la méthode de secours
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const ok = document.execCommand("copy");
  field.remove();
  return ok;
}

// Affichage d'un bloc de code dans l'éditeur : le texte (NodeViewContent) et,
// au survol, un sélecteur de langage et un bouton « Copier ».
export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  async function copy() {
    if (!(await copyText(node.textContent))) return;
    setCopied(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <NodeViewWrapper className="code-block group">
      {/* contentEditable=false : ces contrôles ne font pas partie du texte. */}
      <div
        contentEditable={false}
        className="code-block-toolbar opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 print:hidden"
      >
        <select
          value={node.attrs.language ?? ""}
          onChange={(e) => updateAttributes({ language: e.target.value || null })}
          aria-label="Langage du bloc de code"
        >
          <option value="">Auto</option>
          {codeLanguages.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={copy} aria-label="Copier le code">
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <pre>
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
