import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { io } from "next/cache";
import { flattenFolders, getTree } from "@/db/queries";
import { TreeView } from "@/components/TreeView";
import { SearchButton } from "@/components/SearchPalette";
import { TOOLBOX_TITLE } from "@/lib/constants";

export const metadata = { title: "Boîte à outils" };

export default function ToolboxPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <div className="mb-12 flex items-baseline justify-between">
        <Link href="/" className="text-sm text-foreground/50 hover:text-foreground">
          ← Accueil
        </Link>
        <SearchButton />
      </div>
      <Suspense fallback={<p className="text-foreground/40">Chargement…</p>}>
        <Toolbox />
      </Suspense>
    </main>
  );
}

async function Toolbox() {
  await io();
  const root = getTree().find((node) => node.title === TOOLBOX_TITLE);
  if (!root) notFound();

  return (
    <>
      <h1 className="mb-3 font-mono text-2xl">{root.title}</h1>
      <p className="mb-8 text-sm text-foreground/50">
        Fiches de référence : commandes, syntaxes, rappels.
      </p>
      {/* Les déplacements restent à l'intérieur de la boîte à outils. */}
      <TreeView nodes={root.children} rootId={root.id} folders={flattenFolders([root])} />
    </>
  );
}
