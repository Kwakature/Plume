"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/db/queries";

// Le bouton de l'accueil et le raccourci clavier ouvrent la même palette :
// ils se parlent par un événement du navigateur.
const OPEN_EVENT = "open-search";

export function SearchButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground"
    >
      Rechercher
      <kbd className="rounded border border-foreground/20 px-1.5 font-mono text-xs">
        ⌘K
      </kbd>
    </button>
  );
}

export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const [done, setDone] = useState(false); // la réponse correspond à la saisie
  const listRef = useRef<HTMLUListElement>(null);

  const trimmed = query.trim();

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setDone(false);
  }

  // Ouverture : Cmd+K (Mac) ou Ctrl+K, ou le bouton ; fermeture : Échap.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((current) => !current);
      }
    }
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  // Recherche : on attend 150 ms après la dernière frappe, et on abandonne
  // la requête précédente si une nouvelle saisie arrive.
  useEffect(() => {
    if (!open || trimmed === "") return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data: { results: SearchResult[] } = await response.json();
        setResults(data.results);
        setActive(0);
        setDone(true);
      } catch {
        // requête abandonnée ou serveur injoignable : on garde l'affichage actuel
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, trimmed]);

  // Garde la ligne sélectionnée visible quand on descend avec les flèches.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, results]);

  function go(result: SearchResult | undefined) {
    if (!result) return;
    close();
    router.push(`/page/${result.id}`);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" && results.length > 0) {
      e.preventDefault();
      setActive((active + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length > 0) {
      e.preventDefault();
      setActive((active - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  if (!open) return null;

  // Tant que le champ est vide, on n'affiche aucune liste.
  const shown = trimmed === "" ? [] : results;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/70 px-4 pt-[15vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche"
        className="mx-auto w-full max-w-xl overflow-hidden rounded-lg border border-foreground/15 bg-background shadow-xl"
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setDone(false);
          }}
          onKeyDown={onInputKeyDown}
          placeholder="Rechercher dans les titres et le contenu…"
          role="combobox"
          aria-expanded={shown.length > 0}
          aria-controls="search-results"
          aria-activedescendant={shown.length > 0 ? `search-result-${active}` : undefined}
          className="w-full bg-transparent px-4 py-3 text-lg outline-none"
        />
        {trimmed !== "" && (
          <ul
            id="search-results"
            ref={listRef}
            role="listbox"
            className="max-h-80 overflow-y-auto border-t border-foreground/10"
          >
            {shown.map((result, index) => (
              <li
                key={result.id}
                id={`search-result-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseMove={() => setActive(index)}
                onClick={() => go(result)}
                className={`cursor-pointer px-4 py-2 ${
                  index === active ? "bg-foreground/10" : ""
                }`}
              >
                <div>{result.title}</div>
                {result.path && (
                  <div className="text-xs text-foreground/50">{result.path}</div>
                )}
              </li>
            ))}
            {done && shown.length === 0 && (
              <li className="px-4 py-3 text-sm text-foreground/50">Aucun résultat</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
