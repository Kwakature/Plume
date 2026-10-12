import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { io } from "next/cache";
import { getNode } from "@/db/queries";

export default function NodePage({ params }: PageProps<"/page/[id]">) {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <Suspense fallback={<p className="text-foreground/40">Chargement…</p>}>
        <NodeTitle params={params} />
      </Suspense>
    </main>
  );
}

// Pour l'instant (étape 3), la page affiche seulement son titre.
async function NodeTitle({ params }: { params: PageProps<"/page/[id]">["params"] }) {
  const { id } = await params;
  await io();

  // L'URL peut contenir n'importe quoi (/page/abc) : on vérifie avant de lire la base.
  const numericId = Number(id);
  const node = Number.isInteger(numericId) ? getNode(numericId) : undefined;
  if (!node) notFound();

  return (
    <>
      <Link href="/" className="text-sm text-foreground/50 hover:text-foreground">
        ← Retour
      </Link>
      <h1 className="mt-8 font-mono text-2xl">{node.title}</h1>
    </>
  );
}
