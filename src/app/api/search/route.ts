import { z } from "zod";
import { searchPages } from "@/db/queries";

const querySchema = z.string().trim().max(100);

// GET /api/search?q=mot : pages dont le titre ou le contenu correspond.
// Lire request.url rend ce handler dynamique : il s'exécute à chaque requête.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const parsed = querySchema.safeParse(q);
  if (!parsed.success) {
    return Response.json({ results: [], error: "Recherche trop longue." }, { status: 400 });
  }
  return Response.json({ results: searchPages(parsed.data) });
}
