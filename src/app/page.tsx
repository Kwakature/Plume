import { Suspense } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { flattenFolders, getFavorites, getTree } from "@/db/queries";
import { TreeView } from "@/components/TreeView";
import { SearchButton } from "@/components/SearchPalette";
import { TOOLBOX_TITLE } from "@/lib/constants";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <div className="mb-12 flex items-baseline justify-between">
        <h1 className="font-mono text-2xl">Mes cours</h1>
        <SearchButton />
      </div>
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
        <Section
          key={root.id}
          title={root.title}
          href={root.title === TOOLBOX_TITLE ? "/boite-a-outils" : undefined}
        >
          <TreeView nodes={root.children} rootId={root.id} folders={folders} />
        </Section>
      ))}
    </div>
  );
}

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-foreground/50">
        {href ? (
          <Link href={href} className="hover:text-foreground">
            {title} →
          </Link>
        ) : (
          title
        )}
      </h2>
      {children}
    </section>
  );
}
