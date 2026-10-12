"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { saveContentAction, toggleFavoriteAction } from "@/app/actions";

type SaveStatus = "saved" | "dirty" | "saving" | "error";

const statusLabel: Record<SaveStatus, string> = {
  saved: "Enregistré",
  dirty: "Modifié…",
  saving: "Enregistrement…",
  error: "Échec de l'enregistrement",
};

// Délai après la dernière frappe avant d'enregistrer.
const SAVE_DELAY_MS = 800;

export function PageEditor({
  id,
  title,
  initialText,
  isFavorite,
}: {
  id: number;
  title: string;
  initialText: string;
  isFavorite: boolean;
}) {
  // Dernière valeur tapée : on ne lit pas le <textarea> au moment d'enregistrer,
  // car en quittant la page React l'a déjà détaché.
  const latestText = useRef(initialText);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dirty = useRef(false);
  const [status, setStatus] = useState<SaveStatus>("saved");

  async function save() {
    clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    setStatus("saving");
    const result = await saveContentAction(id, latestText.current);
    if (!result.ok) dirty.current = true; // on retentera à la prochaine frappe
    // Si l'utilisateur a retapé pendant l'envoi, on reste sur « Modifié ».
    setStatus((current) =>
      current !== "saving" ? current : result.ok ? "saved" : "error",
    );
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    latestText.current = e.currentTarget.value;
    dirty.current = true;
    setStatus("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, SAVE_DELAY_MS);
  }

  // Quitter la page avant la fin du délai ne doit pas perdre la dernière frappe.
  // On garde save dans une ref pour que le nettoyage appelle toujours la version à jour.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => () => void saveRef.current(), []);

  return (
    <MotionConfig reducedMotion="user">
      <ActionBar
        id={id}
        isFavorite={isFavorite}
        status={statusLabel[status]}
        isError={status === "error"}
      />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-24">
        <h1 className="mb-8 font-mono text-3xl">{title}</h1>
        <textarea
          defaultValue={initialText}
          onChange={onChange}
          onBlur={save}
          autoFocus
          spellCheck
          aria-label={`Contenu de la page ${title}`}
          className="min-h-[60vh] w-full flex-1 resize-none bg-transparent text-lg leading-8 outline-none field-sizing-content"
        />
      </main>
    </MotionConfig>
  );
}

// Barre d'actions : invisible tant qu'on ne survole pas le coin haut-gauche.
function ActionBar({
  id,
  isFavorite,
  status,
  isError,
}: {
  id: number;
  isFavorite: boolean;
  status: string;
  isError: boolean;
}) {
  const [shown, setShown] = useState(false);

  return (
    // La zone de survol est toujours là (invisible) ; seule la barre s'anime.
    <div
      className="fixed left-0 top-0 z-10 h-24 w-96 max-w-full p-6"
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
        {/* Le vrai export PDF arrive à l'étape 9. */}
        <button
          type="button"
          disabled
          title="Bientôt disponible"
          className="opacity-40"
        >
          Exporter
        </button>
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
