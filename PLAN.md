# Mes cours — plan de développement

Plateforme perso de prise de notes, minimaliste, auto-hébergée. Elle sert de base de cours sur 5 ans d'études et de boîte à outils (fiches de référence). Objectif secondaire : apprendre TypeScript et le développement web moderne en la construisant à la main.

## Besoins

- **Organisation** : Année → Matière → Sous-catégorie (groupe de cours) → Page. Une page peut aussi être directement dans une matière.
- **Boîte à outils** : fiches de référence uniquement (commandes SQL, Git, Linux…).
- **Accueil** : très minimaliste. Arbre des catégories, favoris, paramètres/ajout.
- **Écriture** : uniquement le texte. Les boutons apparaissent en survolant le haut à gauche de la page, pour rester 100 % concentré.
- **Éditeur** : style Notion, le Markdown se transforme en direct (titres, listes, blocs de code).
- **Code** : coloration syntaxique, bouton copier, police de style IDE.
- **Export** : PDF d'une page à la fois, avec la même mise en forme. Export Markdown plus tard.
- **Usage** : local, un seul utilisateur, sans connexion. Accessible via VPN depuis les autres appareils (Mac M4, Raspberry Pi).
- **Animations** : transitions discrètes et fluides.
- **Docker** : développement en direct avec rechargement, puis image de production facile à déployer.

## Stack

| Besoin | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript | Très répandu, un seul langage front et back |
| Style | Tailwind CSS | Rapide pour un design minimaliste |
| Éditeur | Tiptap (ProseMirror) | Markdown en direct, extensible |
| Code dans les notes | lowlight + bouton copier | S'intègre à Tiptap |
| Base de données | SQLite + Drizzle ORM | Un seul fichier, idéal Raspberry, sauvegarde simple |
| Animations | Motion (ex Framer Motion) | Transitions discrètes, apparition au survol |
| Police | JetBrains Mono ou Geist Mono | Style IDE |
| Docker | Compose en dev, image multi-stage en prod | Même image sur Mac M4 et Raspberry (ARM64) |
| Export PDF | CSS d'impression d'abord, Chromium headless ensuite si besoin | Chromium est lourd sur un Pi |

## Modèle de données

Une seule table en arbre : `nodes`.

| Champ | Rôle |
|---|---|
| id | identifiant |
| parent_id | parent (null pour une racine) |
| type | `folder` ou `page` |
| title | titre |
| content | contenu de la page (JSON Tiptap) |
| position | ordre parmi les frères |
| is_favorite | favori |
| created_at / updated_at | dates |

Année, matière et groupe sont des dossiers à des niveaux différents. La boîte à outils est une racine séparée au même fonctionnement.

## Étapes

Chaque étape a un résultat visible. Tu écris le code toi-même, je guide et je relis.

- [x] **1. Fondations** : Docker Compose, projet Next.js en TypeScript, rechargement en direct. *Apprendre* : Docker en dev, structure d'un projet.
- [x] **2. Base de données** : SQLite + Drizzle, table `nodes`, données de test. *Apprendre* : typage des données, migrations.
- [x] **3. Page d'accueil** : arbre années/matières/groupes, favoris. *Apprendre* : composants React, routes, données côté serveur.
- [ ] **4. CRUD de l'arborescence** : créer, renommer, déplacer, supprimer. *Apprendre* : server actions, formulaires, validation.
- [ ] **5. Page d'écriture minimaliste** : texte seul, barre d'actions au survol en haut à gauche. *Apprendre* : interactions, premières animations.
- [ ] **6. Éditeur Tiptap** : Markdown en direct, titres, listes, sauvegarde automatique. *Apprendre* : ProseMirror, état de l'éditeur, debounce.
- [ ] **7. Blocs de code** : coloration, choix du langage, bouton copier, police IDE. *Apprendre* : extensions Tiptap personnalisées.
- [ ] **8. Boîte à outils** : fiches de référence, recherche rapide. *Apprendre* : recherche plein texte SQLite.
- [ ] **9. Export PDF** : une page à la fois, même mise en forme. *Apprendre* : CSS d'impression, génération de PDF.
- [ ] **10. Déploiement et sauvegarde** : image de production, déploiement sur le Raspberry, export Markdown, sauvegarde vers le NAS. *Apprendre* : build multi-arch, volumes, cron.
- [ ] **11. Plus tard** : images, schémas Mermaid, tags, thème clair/sombre, raccourcis clavier, palette de commandes.

## Étape 1 en détail

### Créer le projet

```bash
mkdir ~/projets/mes-cours && cd ~/projets/mes-cours
docker run --rm -it -v "$PWD":/app -w /app node:24-slim npx create-next-app@latest .
```

Réponses : oui à TypeScript, ESLint, Tailwind, dossier `src/`, App Router et Turbopack ; alias d'import par défaut.

```bash
git init && git add . && git commit -m "Initial Next.js project"
```

### Fichiers Docker

`Dockerfile.dev`, `compose.yaml` et `.dockerignore` sont dans ce dossier. À écrire à la main si tu veux t'entraîner, ils servent alors de correction.

Points importants :
- `node_modules` et `.next` restent dans le conteneur (volumes anonymes), sinon c'est lent et les modules compilés seraient ceux de macOS.
- `WATCHPACK_POLLING=true` rend le rechargement fiable avec Docker Desktop.
- Image `slim` (Debian) plutôt qu'`alpine` à cause des modules natifs de SQLite.

### Lancer

```bash
docker compose up --build
```

Ouvre http://localhost:3000. Remplace le contenu de `src/app/page.tsx` par :

```tsx
export default function Home() {
  return <h1 className="p-8 text-2xl">Mes cours</h1>;
}
```

La page doit se mettre à jour toute seule.

### À retenir

- Après l'ajout d'une dépendance : `docker compose up --build -V` (le `-V` recrée le volume `node_modules`).
- `docker compose down` arrête tout.

### Questions de compréhension

1. Que fait `layout.tsx` par rapport à `page.tsx` ?
2. Que se passe-t-il si tu crées `src/app/test/page.tsx` ? À quelle URL ?

## Décisions prises

- Framework : Next.js.
- Données : SQLite d'abord, export Markdown plus tard.
- Pas d'authentification (accès via VPN).
- Éditeur type Notion, on réévaluera si besoin.
- Fiches de référence uniquement pour la boîte à outils.
- Images et schémas : à décider plus tard.