# Mes cours

Plateforme perso de prise de notes, minimaliste, pour un seul utilisateur (pas de connexion : l'accès se fait via VPN).
Organisation Année → Matière → Sous-catégorie → Page, plus une boîte à outils de fiches de référence.

Stack : Next.js (App Router), TypeScript, Tailwind CSS, SQLite + Drizzle, Tiptap, Motion. Tout tourne dans Docker.

## Développement (Mac)

```bash
docker compose up --build
```

Le site est sur http://localhost:3000 avec rechargement à chaud. Toutes les commandes Node passent par le conteneur :

```bash
docker compose exec web npm install <paquet>
docker compose exec web npx tsx src/db/seed.ts     # données de démonstration
docker compose exec web npx tsc --noEmit && docker compose exec web npm run lint
```

Après un changement de dépendances : `docker compose up --build -V`.

## Production (Raspberry)

Prérequis : Docker et Docker Compose, un système 64 bits, environ 4 Go de mémoire.

### Premier lancement

```bash
git clone <adresse-du-dépôt> Plume
cd Plume
docker compose -f compose.prod.yaml up -d --build
```

Rien d'autre à faire : au démarrage l'application crée le dossier `data/`, applique les migrations et crée les racines « Cours » et « Boîte à outils ». Le site est sur `http://<adresse-du-raspberry>:3000` et redémarre tout seul après un redémarrage du Raspberry.

### Mettre à jour

Après un `git push` depuis le Mac, sur le Raspberry :

```bash
./update.sh
```

Le script fait `git pull`, reconstruit l'image et relance le site. Tes notes ne sont pas touchées : elles sont dans `data/`, hors de l'image et hors de git.

### Modifier directement sur le Raspberry

Modifie les fichiers, puis relance `./update.sh` (sans le `git pull` si tu n'as rien à récupérer : `docker compose -f compose.prod.yaml up -d --build`).
Pour des essais avec rechargement à chaud, arrête d'abord la production, puis lance le mode développement :

```bash
docker compose -f compose.prod.yaml down
docker compose up --build        # http://<adresse-du-raspberry>:3000
```

Les deux modes utilisent le même dossier `data/` ; ne les fais pas tourner en même temps (même port).

### Commandes utiles

```bash
docker compose -f compose.prod.yaml logs -f      # journaux
docker compose -f compose.prod.yaml ps           # état (« healthy » = le site et la base répondent)
docker compose -f compose.prod.yaml restart      # redémarrer
docker compose -f compose.prod.yaml down         # arrêter
```

### Si le build échoue

- **« Killed » ou arrêt sans message pendant `npm run build`** : mémoire insuffisante. Le build demande environ 1,5 Go ; ajoute du swap (`sudo dphys-swapfile swapoff`, éditer `CONF_SWAPSIZE` dans `/etc/dphys-swapfile`, puis `sudo dphys-swapfile setup && sudo dphys-swapfile swapon`) et relance.
- **Le bouton « Copier » d'un bloc de code ne fait rien** : sans `https`, le navigateur n'offre pas son presse-papiers moderne ; l'application utilise alors une méthode de secours, qui peut être bloquée par certains navigateurs.

## Données et exports

- La base est le fichier `data/mes-cours.db` (ignoré par git). Pour la déplacer, arrête le site et copie ce fichier.
- Il n'y a pas de sauvegarde automatique : exporte tes notes toi-même.
  - **Une page** : bouton « Markdown » de la barre d'actions (coin haut-gauche de la page) → fichier `.md`.
  - **Un dossier** : bouton ⤓ au survol de la ligne → archive `.zip` avec un `.md` par page. Les dossiers vides n'y figurent pas.
  - **Tout** : « ⤓ tout exporter » sous « Cours » ou « Boîte à outils ».
  - **PDF** : bouton « Exporter » de la page, puis « Enregistrer au format PDF » dans le dialogue d'impression.

## Pour reprendre le projet

`PLAN.md` décrit les étapes et leur état ; `PLAN-CLAUDE-CODE.md` contient les règles de travail et l'état détaillé.
