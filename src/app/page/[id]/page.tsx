import { Suspense } from "react";
import { notFound } from "next/navigation";
import { io } from "next/cache";
import { getNode } from "@/db/queries";
import { PageEditor } from "@/components/PageEditor";
import { toDoc } from "@/lib/content";

export default function NodePage({ params }: PageProps<"/page/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-foreground/40">Chargement…</p>}>
      <NodeContent params={params} />
    </Suspense>
  );
}

async function NodeContent({ params }: { params: PageProps<"/page/[id]">["params"] }) {
  const { id } = await params;
  await io();

  // L'URL peut contenir n'importe quoi (/page/abc) : on vérifie avant de lire la base.
  const numericId = Number(id);
  const node = Number.isInteger(numericId) ? getNode(numericId) : undefined;
  if (!node) notFound();

  // Un dossier n'a pas de texte : on n'affiche que son titre.
  if (node.type === "folder") {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-24">
        <h1 className="font-mono text-3xl">{node.title}</h1>
      </main>
    );
  }

  // Convertit si besoin l'ancien texte brut (étape 5) en document Tiptap.
  const content = toDoc(node.content);

  return (
    <PageEditor
      id={node.id}
      title={node.title}
      initialContent={content}
      isFavorite={node.isFavorite}
    />
  );
}
