import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

// Utilisé par Docker pour savoir si l'application répond ET si la base est lisible.
export async function GET() {
  // better-sqlite3 est synchrone : sans cela, Next figerait la réponse au build.
  await connection();
  try {
    db.get(sql`select 1`);
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "erreur" }, { status: 503 });
  }
}
