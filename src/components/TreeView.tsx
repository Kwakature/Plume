"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  createNodeAction,
  deleteNodeAction,
  moveNodeAction,
  renameNodeAction,
  reorderNodeAction,
  toggleFavoriteAction,
  type ActionResult,
} from "@/app/actions";
import type { FolderOption, TreeNode } from "@/db/queries";

// Ce que tous les éléments de l'arbre partagent : la liste des dossiers
// (pour « déplacer »), l'élément en cours d'édition et l'affichage d'erreur.
type Shared = {
  folders: FolderOption[];
  editingId: number | null;
  setEditingId: (id: number | null) => void;
  setError: (message: string | null) => void;
};

// Appelle une server action : en cas d'échec on affiche le message,
// sinon on exécute onSuccess avec le résultat.
function useRunner(setError: Shared["setError"]) {
  const [pending, startTransition] = useTransition();
  function run<T>(
    action: () => Promise<ActionResult<T>>,
    onSuccess?: (data: T) => void,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setError(null);
        onSuccess?.(result.data);
      } else {
        setError(result.error);
      }
    });
  }
  return { pending, run };
}

// Un bouton d'action discret (visible au survol de la ligne).
const actionButton =
  "rounded px-1 text-foreground/50 hover:bg-foreground/10 hover:text-foreground disabled:opacity-30";

export function TreeView({
  nodes,
  rootId,
  folders,
}: {
  nodes: TreeNode[];
  rootId: number;
  folders: FolderOption[];
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shared: Shared = { folders, editingId, setEditingId, setError };

  return (
    <div>
      <Branch nodes={nodes} shared={shared} />
      <AddButtons
        parentId={rootId}
        shared={shared}
        className="mt-2 text-sm text-foreground/30"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

// Liste d'éléments frères ; chaque Row peut contenir une Branch (récursion).
function Branch({ nodes, shared }: { nodes: TreeNode[]; shared: Shared }) {
  return (
    <ul className="space-y-1">
      {nodes.map((node, index) => (
        <Row
          key={node.id}
          node={node}
          isFirst={index === 0}
          isLast={index === nodes.length - 1}
          shared={shared}
        />
      ))}
    </ul>
  );
}

function Row({
  node,
  isFirst,
  isLast,
  shared,
}: {
  node: TreeNode;
  isFirst: boolean;
  isLast: boolean;
  shared: Shared;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRunner(shared.setError);
  const isFolder = node.type === "folder";
  const isEditing = shared.editingId === node.id;

  // Un dossier ne peut pas être déplacé dans lui-même ni dans ses descendants
  // (le serveur le refuse aussi : ici on évite juste de proposer ces choix).
  const forbidden = new Set([node.id, node.parentId, ...collectIds(node)]);
  const destinations = shared.folders.filter((f) => !forbidden.has(f.id));

  function rename(title: string) {
    shared.setEditingId(null);
    if (title.trim() !== node.title) {
      run(() => renameNodeAction(node.id, title));
    }
  }

  function remove() {
    const message = isFolder
      ? `Supprimer « ${node.title} » et tout ce qu'il contient ?`
      : `Supprimer « ${node.title} » ?`;
    if (window.confirm(message)) run(() => deleteNodeAction(node.id));
  }

  return (
    <li className={pending ? "opacity-50" : undefined}>
      <div className="group flex items-center gap-1">
        {isFolder ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Replier" : "Déplier"}
            className="w-4 text-foreground/50"
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {isEditing ? (
          <TitleInput
            initial={node.title}
            onSubmit={rename}
            onCancel={() => shared.setEditingId(null)}
          />
        ) : isFolder ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="font-mono hover:opacity-70"
          >
            {node.title}
          </button>
        ) : (
          <Link
            href={`/page/${node.id}`}
            className="text-foreground/80 hover:text-foreground hover:underline"
          >
            {node.title}
          </Link>
        )}

        {/* Seules les pages peuvent être favorites. L'étoile reste visible si
            elle est active ; le reste des boutons n'apparaît qu'au survol. */}
        {!isFolder && (
          <button
            type="button"
            onClick={() => run(() => toggleFavoriteAction(node.id))}
            aria-label={node.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            className={`${actionButton} ${
              node.isFavorite
                ? ""
                : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            }`}
          >
            {node.isFavorite ? "★" : "☆"}
          </button>
        )}

        <div className="ml-auto flex items-center gap-0.5 text-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {isFolder && (
            <AddButtons
              parentId={node.id}
              shared={shared}
              onCreated={() => setOpen(true)}
            />
          )}
          <button
            type="button"
            onClick={() => run(() => reorderNodeAction(node.id, "up"))}
            disabled={isFirst}
            aria-label="Monter"
            className={actionButton}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => run(() => reorderNodeAction(node.id, "down"))}
            disabled={isLast}
            aria-label="Descendre"
            className={actionButton}
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => shared.setEditingId(node.id)}
            aria-label="Renommer"
            className={actionButton}
          >
            ✎
          </button>
          <select
            value=""
            onChange={(e) =>
              run(() => moveNodeAction(node.id, Number(e.target.value)))
            }
            aria-label="Déplacer vers"
            className="w-6 cursor-pointer bg-transparent text-foreground/50"
          >
            <option value="" disabled>
              ⇄
            </option>
            {destinations.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={remove}
            aria-label="Supprimer"
            className={actionButton}
          >
            ×
          </button>
        </div>
      </div>

      {isFolder && open && (
        <div className="ml-2 mt-1 border-l border-foreground/15 pl-3">
          {node.children.length > 0 ? (
            <Branch nodes={node.children} shared={shared} />
          ) : (
            <p className="text-sm text-foreground/40">Vide</p>
          )}
        </div>
      )}
    </li>
  );
}

// « + dossier » et « + page » : crée l'élément avec un titre par défaut,
// puis passe tout de suite en édition du titre.
function AddButtons({
  parentId,
  shared,
  onCreated,
  className = "",
}: {
  parentId: number;
  shared: Shared;
  onCreated?: () => void;
  className?: string;
}) {
  const { pending, run } = useRunner(shared.setError);

  function add(type: "folder" | "page") {
    const title = type === "folder" ? "Nouveau dossier" : "Nouvelle page";
    run(
      () => createNodeAction({ parentId, type, title }),
      (id) => {
        onCreated?.();
        shared.setEditingId(id);
      },
    );
  }

  return (
    <span className={className}>
      <button
        type="button"
        onClick={() => add("folder")}
        disabled={pending}
        className={actionButton}
      >
        + dossier
      </button>
      <button
        type="button"
        onClick={() => add("page")}
        disabled={pending}
        className={actionButton}
      >
        + page
      </button>
    </span>
  );
}

// Champ de titre en place : Entrée ou clic ailleurs valide, Échap annule.
function TitleInput({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string;
  onSubmit: (title: string) => void;
  onCancel: () => void;
}) {
  // Entrée valide puis le champ disparaît (ce qui déclenche aussi onBlur) :
  // on retient qu'on a déjà terminé pour ne pas valider deux fois.
  const finished = useRef(false);

  function finish(value: string | null) {
    if (finished.current) return;
    finished.current = true;
    if (value === null) onCancel();
    else onSubmit(value);
  }

  return (
    <input
      autoFocus
      defaultValue={initial}
      maxLength={120}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => finish(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(e.currentTarget.value);
        if (e.key === "Escape") finish(null);
      }}
      className="min-w-0 flex-1 border-b border-foreground/30 bg-transparent font-mono outline-none"
    />
  );
}

// Identifiants de tous les descendants d'un nœud.
function collectIds(node: TreeNode): number[] {
  return node.children.flatMap((child) => [child.id, ...collectIds(child)]);
}
