1. Contexte

Plateforme perso de prise de notes, minimaliste, auto-hébergée, pour un seul utilisateur (pas d'authentification, accès via VPN). Elle sert de base de cours sur 5 ans d'études et de boîte à outils (fiches de référence). Le projet est aussi un support d'apprentissage de TypeScript et du web moderne : le propriétaire veut comprendre ce qui est écrit.

Stack : Next.js (App Router) + React + TypeScript, Tailwind CSS, SQLite + Drizzle ORM (better-sqlite3), Tiptap (éditeur type Notion), Motion (animations discrètes), polices JetBrains Mono ou Geist Mono, Docker.

Cible : développement sur Mac M4 (Docker Desktop), production sur Raspberry Pi (ARM64).

Langue : réponses, commentaires de commit et textes de l'interface en français.

2. Fonctionnalités attendues
Organisation : Année → Matière → Sous-catégorie (groupe de cours) → Page. Une page peut aussi être directement dans une matière. Boîte à outils séparée, avec fiches de référence uniquement.
Accueil : très minimaliste. Arbre des catégories, favoris, paramètres et ajout.
Écriture : page avec uniquement le texte. Les boutons apparaissent en survolant le haut à gauche de la page (retour, favori, export…), pour rester concentré.
Éditeur : style Notion, le Markdown se transforme en direct (titres, listes, blocs de code). Sauvegarde automatique.
Code : coloration syntaxique, choix du langage, bouton copier, police de style IDE. Pas d'exécution.
Export : PDF d'une page à la fois, avec la même mise en forme. Export Markdown plus tard.
Animations : transitions discrètes et fluides, jamais spectaculaires.
Design : le plus minimaliste possible, pensé pour les notes. Thème clair/sombre à prévoir.
3. Règles de travail
Une étape à la fois. Ne pas commencer l'étape suivante sans validation du propriétaire.
Un commit par étape terminée, message en français, clair (ex. Étape 2 : base SQLite et schéma nodes).
Docker uniquement. Toutes les commandes Node s'exécutent dans le conteneur :
installer : docker compose exec web npm install <paquet>
lancer un script : docker compose exec web npx tsx <fichier>
ne pas utiliser le Node du Mac.
Ne jamais committer data/ (la base SQLite). Le dossier drizzle/ (migrations) est committé.
Demander avant d'ajouter une dépendance non prévue dans la stack ci-dessus.
Vérifier la doc de la version installée (Next.js, Drizzle, Tiptap) : les API évoluent vite. En cas de doute, consulter la doc officielle plutôt que se fier à la mémoire.
Expliquer brièvement ce qui a été fait et pourquoi, à la fin de chaque étape : le propriétaire apprend.
Code simple et lisible, TypeScript strict, pas d'abstraction prématurée.
Après un changement de dépendances, le conteneur doit être reconstruit : docker compose up --build -V (le -V recrée le volume node_modules).
Mode d'accompagnement

Le propriétaire peut choisir, étape par étape :

Délégué : Claude Code écrit tout, puis explique.
Guidé : Claude Code donne les indices et relit le code écrit par le propriétaire.

Par défaut : délégué, avec explication à la fin. Demander au démarrage de chaque étape si le propriétaire préfère le mode guidé.

4. État actuel
Étape 1 terminée : projet Next.js en TypeScript, Docker Compose de développement (Dockerfile.dev, compose.yaml, .dockerignore), page par défaut accessible sur http://localhost:3000.
Le port 3000:3000 est mappé, node_modules et .next sont dans des volumes anonymes, WATCHPACK_POLLING=true est activé.
Le nom du service Compose est web.
Étape 2 terminée : SQLite + Drizzle (src/db/), migration dans drizzle/, base dans data/mes-cours.db (non committée), seed idempotent. Le code est dans src/ (alias @/* → ./src/*). Dockerfile.dev installe python3 make g++ pour better-sqlite3.
Étape 3 terminée : accueil avec arbre repliable (src/components/TreeView.tsx), favoris, requêtes dans src/db/queries.ts, route /page/[id] qui affiche le titre.
Étape 4 terminée : server actions (src/app/actions.ts, validation zod), logique dans src/db/mutations.ts (anti-cycle), arbre interactif dans src/components/TreeView.tsx. DATABASE_PATH permet de tester sur une base copie.
Étape 5 terminée : page d'écriture (src/components/PageEditor.tsx), barre d'actions au survol animée avec Motion, sauvegarde automatique du texte brut (debounce 800 ms, flush au blur et au démontage).
Étape 6 terminée : éditeur Tiptap dans src/components/PageEditor.tsx (StarterKit sans link ni underline), contenu stocké en JSON Tiptap, conversion du texte brut dans src/lib/content.ts (toDoc) et script src/db/migrate-content.ts, styles .tiptap dans globals.css (après une modification de globals.css, vérifier que les règles sont bien dans le CSS compilé : un ajout en fin de fichier n'a pas été pris en compte par le serveur de dev, une modification de contenu oui).
Étape 7 terminée : blocs de code lowlight (src/lib/lowlight.ts, src/components/CodeBlockView.tsx) avec sélecteur de langage et bouton copier, coloration claire/sombre dans globals.css. Les attributs ProseMirror sont des objets sans prototype : PageEditor passe par JSON.parse(JSON.stringify()) avant d'appeler la server action, sinon React les supprime en silence.
Étape 8 non commencée.
5. Étapes
Étape 2 : base de données

Tâches

Installer drizzle-orm et better-sqlite3 ; en dev : drizzle-kit, @types/better-sqlite3, tsx.
Créer data/ et l'ajouter à .gitignore et .dockerignore.
Créer src/db/schema.ts avec la table nodes :
id (entier, clé primaire auto-incrémentée)
parentId (entier nullable, référence nodes.id, onDelete: cascade)
type ("folder" ou "page", non nul)
title (texte, non nul)
content (JSON nullable)
position (entier, défaut 0)
isFavorite (booléen, défaut faux)
createdAt / updatedAt (timestamp, défaut unixepoch())
exporter les types Node et NewNode
attention à la référence circulaire : annoter avec AnySQLiteColumn
Créer src/db/index.ts : connexion data/mes-cours.db, journal_mode = WAL, foreign_keys = ON, export de db.
Créer drizzle.config.ts, générer puis appliquer la migration (drizzle-kit generate, drizzle-kit migrate).
Créer src/db/seed.ts (idempotent : ne rien faire si des données existent) :
racines « Cours » et « Boîte à outils » (dossiers sans parent)
« Année 1 » dans « Cours », « Algorithmique » dans « Année 1 », page « Introduction » dans « Algorithmique »
fiche « Commandes SQL » dans « Boîte à outils »
Remplacer src/app/page.tsx par une page temporaire qui affiche les lignes en JSON.

Validation

La migration est présente dans drizzle/ et appliquée sans erreur.
docker compose exec web npx tsx src/db/seed.ts s'exécute deux fois sans doublons.
La page http://localhost:3000 affiche les 6 lignes.
Supprimer « Année 1 » (par une requête de test) supprime aussi ses descendants.
npx tsc --noEmit et npm run lint passent.

Piège connu : si better-sqlite3 échoue à l'installation (compilation native), ajouter python3 make g++ dans Dockerfile.dev (apt-get install) et reconstruire.

Étape 3 : page d'accueil

Tâches

Fonctions de lecture dans src/db/queries.ts : récupérer l'arbre complet (une requête, assemblé en TypeScript), la liste des favoris.
Composant d'arbre récursif, dossiers repliables, pages cliquables.
Section « Favoris » en haut, section « Boîte à outils » séparée de « Cours ».
Design minimaliste, police mono pour les titres, peu de couleurs.
Route /page/[id] (vide pour l'instant, affiche seulement le titre).

Validation : l'arbre de test s'affiche correctement, les favoris apparaissent en haut, un clic sur une page mène à /page/<id>.

Étape 4 : gestion de l'arborescence

Tâches

Server actions : créer un dossier ou une page, renommer, supprimer (avec confirmation), basculer le favori, déplacer (changer de parent), réordonner (position).
Validation des entrées (par exemple avec zod, à confirmer avant d'ajouter la dépendance).
Interface discrète : boutons visibles au survol, édition du titre en place.
Empêcher les cycles lors d'un déplacement (un dossier ne peut pas devenir son propre descendant).

Validation : toutes les actions fonctionnent depuis l'interface et persistent après rechargement ; le cycle est refusé ; la suppression en cascade fonctionne.

Étape 5 : page d'écriture minimaliste

Tâches

Route /page/[id] : uniquement le titre et une zone de texte plein écran, largeur de lecture confortable.
Barre d'actions qui apparaît en survolant le coin haut-gauche (retour, favori, export), avec transition douce (Motion).
Aucune autre interface visible.
Sauvegarde du texte brut dans content (provisoire, remplacé par Tiptap à l'étape 6).

Validation : en dehors du coin haut-gauche, rien d'autre que le texte n'est visible ; la barre apparaît et disparaît en douceur ; le texte persiste.

Étape 6 : éditeur Tiptap

Tâches

Installer @tiptap/react, @tiptap/pm, @tiptap/starter-kit (et les extensions nécessaires).
Dans Next.js, créer l'éditeur dans un composant client avec immediatelyRender: false pour éviter les erreurs d'hydratation.
Raccourcis Markdown en direct (#, -, 1., >, `, etc.).
Sauvegarde automatique avec debounce (~800 ms), indicateur discret « enregistré ».
Stocker le contenu au format JSON Tiptap dans content.
Écrire une fonction de migration du texte brut de l'étape 5 vers le JSON.

Validation : taper # Titre puis espace donne un titre ; le contenu est restauré à l'identique après rechargement ; aucune erreur d'hydratation dans la console.

Étape 7 : blocs de code

Tâches

Extension CodeBlockLowlight avec lowlight (langages utiles aux études : sql, bash, python, typescript, javascript, java, c, html, css, json, yaml, markdown).
Sélecteur de langage dans le bloc.
Bouton « copier » avec retour visuel discret.
Police mono (JetBrains Mono ou Geist Mono via next/font), thème de coloration cohérent clair/sombre.

Validation : un bloc SQL est coloré, le bouton copie le contenu exact, le langage choisi est conservé après rechargement.

Étape 8 : boîte à outils et recherche

Tâches

Vue dédiée pour la racine « Boîte à outils », accessible depuis l'accueil.
Recherche rapide (raccourci clavier, par exemple Cmd+K) : titre et contenu.
Évaluer FTS5 de SQLite pour la recherche plein texte ; sinon recherche LIKE suffisante au début.

Validation : une recherche retrouve une fiche par un mot de son contenu en moins de 200 ms ; les résultats sont cliquables au clavier.

Étape 9 : export PDF

Tâches

Commencer par une feuille de style d'impression (@media print) propre : masquer toute interface, conserver la coloration du code, marges correctes.
Bouton d'export dans la barre d'actions de la page d'écriture.
Si le rendu n'est pas satisfaisant, proposer une génération côté serveur avec Chromium headless, en prévenant que c'est lourd sur le Raspberry Pi (demander avant d'ajouter la dépendance).

Validation : le PDF d'une page ressemble à l'écran (titres, listes, code coloré), sans éléments d'interface.

Étape 10 : déploiement et sauvegarde

Tâches

Dockerfile de production multi-étapes (dépendances, build, exécution), avec output: "standalone" dans la config Next.js.
Vérifier que better-sqlite3 fonctionne dans l'image finale.
Appliquer automatiquement les migrations au démarrage.
compose.prod.yaml : volume nommé ou dossier monté pour data/, redémarrage automatique (restart: unless-stopped).
Build multi-architecture (linux/arm64 pour le Raspberry Pi) avec docker buildx.
Script de sauvegarde (copie de la base avec sqlite3 .backup ou VACUUM INTO) et planification, destination NAS.
Export Markdown d'une page et de tout un arbre.

Validation : l'image démarre sur le Raspberry, les données survivent à un redémarrage du conteneur, une sauvegarde est restaurable sur une base vierge.

Étape 11 : plus tard

Images, schémas Mermaid, tags, thème clair/sombre avancé, raccourcis clavier, palette de commandes.

6. Définition de « terminé » pour chaque étape
Les critères de validation de l'étape sont satisfaits.
npx tsc --noEmit et npm run lint passent.
Le site se lance avec docker compose up sans erreur.
Le commit de l'étape est fait.
Le résumé explicatif est donné au propriétaire.
Les cases correspondantes sont cochées dans PLAN.md.