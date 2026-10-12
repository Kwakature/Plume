import { Suspense } from "react";
import { io } from "next/cache";
import { db } from "@/db";
import { nodes } from "@/db/schema";

// Page temporaire (étape 2) : affiche le contenu brut de la table nodes.
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl">Mes cours</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <NodesJson />
      </Suspense>
    </main>
  );
}

async function NodesJson() {
  // better-sqlite3 est synchrone : io() indique à Next.js de lire la base
  // à chaque requête plutôt que de figer le résultat au build.
  await io();
  const rows = db.select().from(nodes).all();
  return (
    <pre className="text-sm">{JSON.stringify(rows, null, 2)}</pre>
  );
}
