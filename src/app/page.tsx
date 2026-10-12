import { Suspense } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { flattenFolders, getFavorites, getTree } from "@/db/queries";
import { TreeView } from "@/components/TreeView";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <h1 className="mb-12 font-mono text-2xl">Mes cours</h1>
      <Suspense fallback={<p className="text-foreground/40">Chargement…</p>}>
        <HomeContent />
      </Suspense>
    </main>
  );
}

async function HomeContent() {
  // better-sqlite3 est synchrone : io() force la lecture à chaque requête
  // plutôt que de figer le résultat au build.
  await io();
  const favorites = getFavorites();
  const roots = getTree();
  const folders = flattenFolders(roots);

  return (
    <div className="space-y-12">
      {favorites.length > 0 && (
        <Section title="Favoris">
          <ul className="space-y-1">
            {favorites.map((node) => (
              <li key={node.id}>
                <Link
                  href={`/page/${node.id}`}
                  className="text-foreground/80 hover:text-foreground hover:underline"
                >
                  {node.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Chaque racine (Cours, Boîte à outils) est une section distincte. */}
      {roots.map((root) => (
        <Section key={root.id} title={root.title}>
          <TreeView nodes={root.children} rootId={root.id} folders={folders} />
        </Section>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-foreground/50">
        {title}
      </h2>
      {children}
    </section>
  );
}
