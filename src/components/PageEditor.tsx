"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import {
  EditorContent,
  ReactNodeViewRenderer,
  useEditor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { CodeBlockView } from "@/components/CodeBlockView";
import { lowlight } from "@/lib/lowlight";
import { saveContentAction, toggleFavoriteAction } from "@/app/actions";

type SaveStatus = "saved" | "dirty" | "saving" | "error";

const statusLabel: Record<SaveStatus, string> = {
  saved: "Enregistré",
  dirty: "Modifié…",
  saving: "Enregistrement…",
  error: "Échec de l'enregistrement",
};

// Bloc de code coloré par lowlight, affiché avec notre composant React
// (sélecteur de langage, bouton copier) au lieu du <pre> par défaut.
const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({ lowlight });

// Délai après la dernière frappe avant d'enregistrer.
const SAVE_DELAY_MS = 800;

export function PageEditor({
  id,
  title,
  initialContent,
  isFavorite,
}: {
  id: number;
  title: string;
  initialContent: JSONContent;
  isFavorite: boolean;
}) {
  // Dernier contenu édité : on ne le relit pas dans l'éditeur au moment
  // d'enregistrer, car en quittant la page React l'a déjà détruit.
  const latestContent = useRef<JSONContent>(initialContent);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dirty = useRef(false);
  const [status, setStatus] = useState<SaveStatus>("saved");

  async function save() {
    clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    setStatus("saving");
    const result = await saveContentAction(id, latestContent.current);
    if (!result.ok) dirty.current = true; // on retentera à la prochaine frappe
    // Si l'utilisateur a retapé pendant l'envoi, on reste sur « Modifié ».
    setStatus((current) =>
      current !== "saving" ? current : result.ok ? "saved" : "error",
    );
  }

  function onContentChange(content: JSONContent) {
    // Les attributs des nœuds ProseMirror sont des objets sans prototype ;
    // React ne les transmet pas à une server action (ils disparaissaient en
    // silence, par exemple le langage d'un bloc de code). Passer par du JSON
    // texte donne des objets simples.
    latestContent.current = JSON.parse(JSON.stringify(content));
    dirty.current = true;
    setStatus("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, SAVE_DELAY_MS);
  }

  // Quitter la page avant la fin du délai ne doit pas perdre la dernière frappe.
  // On garde ces fonctions dans des refs pour que l'éditeur et le nettoyage
  // appellent toujours la version à jour.
  const saveRef = useRef(save);
  const changeRef = useRef(onContentChange);
  useEffect(() => {
    saveRef.current = save;
    changeRef.current = onContentChange;
  });
  useEffect(() => () => void saveRef.current(), []);

  const editor = useEditor({
    // Tiptap rend l'éditeur côté client uniquement : sans cela, le HTML du
    // serveur et celui du navigateur diffèrent (erreur d'hydratation).
    immediatelyRender: false,
    extensions: [
      // StarterKit contient les raccourcis Markdown (#, -, 1., >, ```, `…).
      // Son bloc de code est remplacé par CodeBlock ; liens et soulignement
      // ne sont pas demandés : on les retire.
      StarterKit.configure({ codeBlock: false, link: false, underline: false }),
      CodeBlock,
    ],
    content: initialContent,
    autofocus: "end",
    editorProps: {
      attributes: {
        class: "tiptap min-h-[60vh] outline-none print:min-h-0",
        "aria-label": `Contenu de la page ${title}`,
      },
    },
    onUpdate: ({ editor }) => changeRef.current(editor.getJSON()),
    onBlur: () => void saveRef.current(),
  });

  return (
    <MotionConfig reducedMotion="user">
      <ActionBar
        id={id}
        title={title}
        isFavorite={isFavorite}
        status={statusLabel[status]}
        isError={status === "error"}
      />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-24 print:max-w-none print:p-0">
        <h1 className="mb-8 font-mono text-3xl print:mb-6">{title}</h1>
        <EditorContent editor={editor} />
      </main>
    </MotionConfig>
  );
}

// Export PDF : on ouvre le dialogue d'impression du navigateur, où l'on choisit
// « Enregistrer au format PDF ». La feuille de style @media print (globals.css)
// masque l'interface. Le titre du document devient le nom du fichier proposé.
function exportPdf(title: string) {
  const previousTitle = document.title;
  document.title = title;
  window.addEventListener(
    "afterprint",
    () => {
      document.title = previousTitle;
    },
    { once: true },
  );
  window.print();
}

// Barre d'actions : invisible tant qu'on ne survole pas le coin haut-gauche.
function ActionBar({
  id,
  title,
  isFavorite,
  status,
  isError,
}: {
  id: number;
  title: string;
  isFavorite: boolean;
  status: string;
  isError: boolean;
}) {
  const [shown, setShown] = useState(false);

  return (
    // La zone de survol est toujours là (invisible) ; seule la barre s'anime.
    <div
      className="fixed left-0 top-0 z-10 h-24 w-96 max-w-full p-6 print:hidden"
      onPointerEnter={() => setShown(true)}
      onPointerLeave={() => setShown(false)}
      onFocus={() => setShown(true)}
      onBlur={(e) => {
        // Le focus peut passer d'un bouton à l'autre sans quitter la barre.
        if (!e.currentTarget.contains(e.relatedTarget)) setShown(false);
      }}
    >
      <motion.nav
        initial={false}
        animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : -6 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ pointerEvents: shown ? "auto" : "none" }}
        className="flex items-center gap-4 text-sm text-foreground/60"
      >
        <Link href="/" className="hover:text-foreground">
          ← Retour
        </Link>
        <button
          type="button"
          onClick={() => toggleFavoriteAction(id)}
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          className="hover:text-foreground"
        >
          {isFavorite ? "★" : "☆"}
        </button>
        <button
          type="button"
          onClick={() => exportPdf(title)}
          title="Exporter en PDF"
          className="hover:text-foreground"
        >
          Exporter
        </button>
        {/* Téléchargement du texte de la page en Markdown. */}
        <a
          href={`/api/export/${id}`}
          download
          title="Exporter en Markdown"
          className="hover:text-foreground"
        >
          Markdown
        </a>
        <span
          role="status"
          className={isError ? "text-red-600 dark:text-red-400" : "text-foreground/40"}
        >
          {status}
        </span>
      </motion.nav>
    </div>
  );
}
