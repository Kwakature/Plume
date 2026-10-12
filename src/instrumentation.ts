// Appelé une fois au démarrage du serveur, avant la première requête.
// On y prépare la base : dossier data/ créé (voir db/index.ts), migrations
// appliquées et racines créées. Un clone neuf démarre sans aucune commande manuelle.
export async function register() {
  // Le serveur peut aussi tourner dans le runtime « edge », sans accès aux fichiers.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prepareDatabase } = await import("./db/prepare");
    prepareDatabase();
  }
}
