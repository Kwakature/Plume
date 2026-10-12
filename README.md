# Mes cours

Plateforme personnelle de prise de notes, minimaliste, auto-hébergée, pour **un seul utilisateur** (pas de connexion : l'accès se fait par VPN).
Les notes sont rangées en Année → Matière → Sous-catégorie → Page, avec en plus une boîte à outils de fiches de référence.

- **Éditeur** type Notion : le Markdown se transforme en direct, blocs de code colorés, sauvegarde automatique.
- **Recherche** rapide (Cmd+K / Ctrl+K) dans les titres et le contenu.
- **Exports** : PDF d'une page, Markdown d'une page, archive `.zip` d'un dossier.
- **Stack** : Next.js (App Router), TypeScript, Tailwind CSS, SQLite + Drizzle, Tiptap, Motion, Docker.

## Sommaire

1. [Comment ça marche](#1-comment-ça-marche)
2. [Déployer sur le Raspberry](#2-déployer-sur-le-raspberry)
3. [Utilisation au quotidien](#3-utilisation-au-quotidien)
4. [Mettre à jour](#4-mettre-à-jour)
5. [Modifier le projet depuis le Raspberry](#5-modifier-le-projet-depuis-le-raspberry)
6. [Vos données](#6-vos-données)
7. [Dépannage](#7-dépannage)
8. [Sécurité](#8-sécurité)
9. [Développement sur le Mac](#9-développement-sur-le-mac)
10. [Structure du projet](#10-structure-du-projet)

---

## 1. Comment ça marche

```
Raspberry
├── Plume/                    ← le dépôt cloné (le code)
│   ├── compose.prod.yaml     ← décrit comment lancer le site
│   ├── Dockerfile            ← construit l'image du site
│   ├── update.sh             ← met à jour le site
│   └── data/                 ← VOS NOTES (créé au premier lancement, ignoré par git)
│       └── mes-cours.db
└── Docker
    └── conteneur « plume-web-1 »  ← le site, sur le port 3000
          └── lit et écrit dans Plume/data/
```

Points importants :

- **Le code et les notes sont séparés.** L'image Docker contient le code ; vos notes sont dans le dossier `data/` du Raspberry, monté dans le conteneur. Reconstruire ou mettre à jour le site ne touche donc jamais à vos notes.
- **Tout est automatique au démarrage.** L'application crée `data/`, applique les migrations de la base et crée les deux racines « Cours » et « Boîte à outils » si la base est neuve. Il n'y a aucune commande de préparation à lancer.
- **Le site redémarre tout seul** après un redémarrage du Raspberry (`restart: unless-stopped`).
- **L'image se construit sur le Raspberry** à partir du dépôt : pas de registre Docker à configurer.

---

## 2. Déployer sur le Raspberry

### 2.1 Prérequis

| Élément | Détail |
|---|---|
| Matériel | Raspberry Pi 4 ou 5, **4 Go de mémoire recommandés** (le build utilise environ 1,5 Go) |
| Système | Raspberry Pi OS **64 bits** (ou tout Linux 64 bits). Vérification ci-dessous. |
| Réseau | Accès à Internet pendant le premier build (téléchargement de l'image Node et des paquets) |
| Dépôt | Le projet doit être accessible depuis le Raspberry (voir 2.3) |

Vérifiez l'architecture et la mémoire :

```bash
uname -m      # doit afficher : aarch64
free -h       # colonne « total » de la ligne Mem
```

Si `uname -m` affiche `armv7l`, le système est en 32 bits : il faut réinstaller un système 64 bits.

### 2.2 Installer Docker

Suivez la documentation officielle de Docker pour Debian (valable pour Raspberry Pi OS 64 bits) :
<https://docs.docker.com/engine/install/debian/>

Puis autorisez votre utilisateur à utiliser Docker sans `sudo` (déconnectez-vous et reconnectez-vous ensuite) :

```bash
sudo usermod -aG docker $USER
```

Vérifiez :

```bash
docker --version
docker compose version     # doit répondre (Docker Compose v2)
docker run --rm hello-world
```

### 2.3 Récupérer le projet

Il faut que le Raspberry puisse lire le dépôt.

- **Dépôt public** : `git clone` suffit.
- **Dépôt privé** : créez une clé SSH sur le Raspberry et ajoutez la clé publique à votre compte (GitHub : *Settings → SSH and GPG keys*, ou une *deploy key* sur le dépôt) :

  ```bash
  ssh-keygen -t ed25519 -C "raspberry"
  cat ~/.ssh/id_ed25519.pub        # à coller dans les paramètres du dépôt
  ```

Puis :

```bash
git clone <adresse-du-dépôt> Plume
cd Plume
```

### 2.4 Premier lancement

```bash
docker compose -f compose.prod.yaml up -d --build
```

Le premier build télécharge l'image Node et les dépendances : comptez plusieurs minutes sur un Raspberry. Les suivants sont beaucoup plus rapides grâce au cache Docker.

### 2.5 Vérifier que tout fonctionne

```bash
docker compose -f compose.prod.yaml ps
```

La colonne *STATUS* doit afficher **`Up … (healthy)`** (le statut `health: starting` pendant les 20 premières secondes est normal).

```bash
curl http://localhost:3000/api/health      # doit répondre : {"status":"ok"}
```

Ouvrez ensuite `http://<adresse-du-raspberry>:3000` depuis un autre appareil (via le VPN) : vous devez voir l'accueil avec « Cours » et « Boîte à outils ». Pour connaître l'adresse du Raspberry : `hostname -I`.

Testez enfin un redémarrage : `sudo reboot`, puis rouvrez le site après une minute. Il doit être revenu tout seul.

### 2.6 Changer le port (facultatif)

Dans `compose.prod.yaml`, modifiez la partie gauche du mapping de ports. Par exemple pour le port 8080 :

```yaml
    ports:
      - "8080:3000"
```

puis relancez `docker compose -f compose.prod.yaml up -d`.

---

## 3. Utilisation au quotidien

### Accueil

- **Favoris** en haut (seulement s'il y en a), puis **Cours** et **Boîte à outils**.
- Les boutons apparaissent **au survol** d'une ligne : `+ dossier`, `+ page`, `↑ ↓` (réordonner), `✎` (renommer), `⇄` (déplacer), `⤓` (exporter), `×` (supprimer, avec confirmation), `☆` (favori, pages seulement).
- Un nouvel élément passe directement en édition du titre : Entrée valide, Échap annule.
- Le titre « Boîte à outils → » ouvre la vue dédiée aux fiches de référence.

### Écrire

Cliquez sur une page : seul le texte est affiché. Survolez le **coin haut-gauche** pour voir la barre d'actions (retour, favori, export PDF, export Markdown, état d'enregistrement). Le texte s'enregistre tout seul environ 0,8 s après la dernière frappe.

| Vous tapez | Résultat |
|---|---|
| `# ` / `## ` / `### ` puis espace | titres |
| `- ` | liste à puces |
| `1. ` | liste numérotée |
| `> ` | citation |
| `` `code` `` | code dans une phrase |
| `**gras**` | gras |
| ` ``` ` puis espace (ou ` ```sql ` puis espace) | bloc de code |

Dans un bloc de code, au survol : choix du langage (SQL, Bash, Python, TypeScript, JavaScript, Java, C, HTML, CSS, JSON, YAML, Markdown, ou Auto) et bouton **Copier**.

### Rechercher

**Cmd+K** (Mac) ou **Ctrl+K** ouvre la recherche depuis n'importe quelle page. Les accents et les majuscules sont ignorés, tous les mots tapés doivent apparaître. Flèches ↑ ↓ pour choisir, Entrée pour ouvrir, Échap pour fermer.

### Exporter

| Besoin | Comment |
|---|---|
| Une page en PDF | Bouton **Exporter** de la page, puis « Enregistrer au format PDF » dans le dialogue d'impression (Cmd+P donne le même résultat) |
| Une page en Markdown | Bouton **Markdown** de la page → fichier `.md` |
| Un dossier | Bouton **⤓** au survol de la ligne → archive `.zip` avec un `.md` par page, rangés comme dans l'arbre |
| Tout | **⤓ tout exporter** sous « Cours » ou « Boîte à outils » |

Les dossiers vides n'apparaissent pas dans un `.zip` (une archive ne contient que des fichiers).

---

## 4. Mettre à jour

Après un `git push` depuis votre Mac, sur le Raspberry :

```bash
cd Plume
./update.sh
```

Le script fait `git pull`, reconstruit l'image, relance le site, supprime les anciennes images inutiles et affiche l'état. Les nouvelles migrations de la base s'appliquent toutes seules au démarrage.

Si `git pull` refuse de continuer, c'est que des fichiers ont été modifiés à la main sur le Raspberry : voir la section suivante.

> Si `./update.sh` répond « Permission denied » : `chmod +x update.sh`.

---

## 5. Modifier le projet depuis le Raspberry

### Petite modification, test en production

1. Modifiez les fichiers.
2. Reconstruisez et relancez :

   ```bash
   docker compose -f compose.prod.yaml up -d --build
   ```

### Essais avec rechargement à chaud

Arrêtez la production (même port), puis lancez le mode développement :

```bash
docker compose -f compose.prod.yaml down
docker compose up --build            # http://<adresse-du-raspberry>:3000
```

Le mode développement est lent sur un Raspberry et ne redémarre pas tout seul : c'est un outil de dépannage. Les deux modes partagent le même dossier `data/` : **ne les lancez jamais en même temps**. Quand vous avez fini : `Ctrl+C`, `docker compose down`, puis relancez la production.

### Garder ses modifications

Pour que `git pull` ne soit pas bloqué, enregistrez vos modifications dans git :

```bash
git add -A && git commit -m "Description de la modification"
git push                             # si le Raspberry a un accès en écriture au dépôt
```

Sans accès en écriture, récupérez la modification sur le Mac (`git diff` puis copie) ou abandonnez-la avec `git restore .` avant de faire `./update.sh`.

---

## 6. Vos données

- Toutes vos notes sont dans **`data/mes-cours.db`** (SQLite), à côté de deux fichiers temporaires `mes-cours.db-wal` et `mes-cours.db-shm`. Le dossier `data/` est ignoré par git.
- **Il n'y a pas de sauvegarde automatique** : si la carte SD lâche, les notes sont perdues. Exportez régulièrement ce qui compte (section 3, « Exporter »).
- Pour déplacer la base (par exemple du Mac vers le Raspberry) : **arrêtez le site**, puis copiez **tout le dossier `data/`** (les trois fichiers) :

  ```bash
  docker compose -f compose.prod.yaml down
  scp -r data/ utilisateur@raspberry:~/Plume/        # depuis la machine qui a la base
  docker compose -f compose.prod.yaml up -d          # sur le Raspberry
  ```

- Pour repartir de zéro (efface tout !) :

  ```bash
  docker compose -f compose.prod.yaml down
  rm -rf data
  docker compose -f compose.prod.yaml up -d
  ```

---

## 7. Dépannage

### Commandes utiles

```bash
docker compose -f compose.prod.yaml ps               # état (healthy = ça répond)
docker compose -f compose.prod.yaml logs -f          # journaux en direct (Ctrl+C pour quitter)
docker compose -f compose.prod.yaml restart          # redémarrer
docker compose -f compose.prod.yaml down             # arrêter
docker compose -f compose.prod.yaml up -d --build    # reconstruire et relancer
docker system df                                     # place utilisée par Docker
```

### Problèmes courants

| Symptôme | Cause probable | Solution |
|---|---|---|
| Le build s'arrête sur `Killed` ou sans message pendant `npm run build` | Mémoire insuffisante | Ajouter du swap (ci-dessous), puis relancer |
| `permission denied` sur `/var/run/docker.sock` | L'utilisateur n'est pas dans le groupe `docker` | `sudo usermod -aG docker $USER`, puis se reconnecter |
| `exec format error` au démarrage | Système 32 bits ou image d'une autre architecture | Vérifier `uname -m` (doit être `aarch64`), reconstruire sur le Raspberry |
| `port is already allocated` | Un autre programme (ou le mode développement) utilise le port 3000 | `docker compose down` des deux modes, ou changer le port (2.6) |
| Statut `unhealthy` | L'application ne répond pas ou la base est illisible | `docker compose -f compose.prod.yaml logs` |
| Le site ne répond pas depuis un autre appareil | VPN, pare-feu ou mauvaise adresse | Tester `curl http://localhost:3000/api/health` sur le Raspberry, puis vérifier l'adresse (`hostname -I`) et le VPN |
| Le bouton « Copier » ne copie rien | Sans `https`, le navigateur restreint le presse-papiers | Une méthode de secours est utilisée, mais certains navigateurs la bloquent : sélectionner et copier à la main |
| Rien ne change après `./update.sh` | Le `git push` n'a pas été fait, ou le navigateur affiche une ancienne version | Vérifier `git log`, puis recharger la page (Cmd+Maj+R) |
| Plus de place sur la carte SD | Anciennes images et caches de build | `docker image prune -f` et `docker builder prune -f` |

### Ajouter du swap (si le build est tué faute de mémoire)

Sur Raspberry Pi OS :

```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile         # mettre CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
free -h                               # la ligne Swap doit afficher environ 2 Go
```

> Le swap sur carte SD l'use à la longue : utile pour un build ponctuel, pas pour un usage permanent.

---

## 8. Sécurité

L'application **n'a pas de système de connexion** : quiconque atteint le port 3000 peut lire, modifier et supprimer toutes les notes.

- **N'exposez jamais le port 3000 sur Internet** (pas de redirection de port sur la box). Accédez au site uniquement par le VPN.
- Le conteneur ne tourne pas en root : le site s'exécute avec l'utilisateur `node`.
- Pour limiter l'accès au Raspberry lui-même, vous pouvez restreindre le port à l'adresse locale et passer par un proxy ou un tunnel, en écrivant `"127.0.0.1:3000:3000"` dans `compose.prod.yaml`. Ce n'est pas fourni ici.

---

## 9. Développement sur le Mac

Tout passe par Docker : n'utilisez pas le Node du Mac.

```bash
docker compose up --build            # http://localhost:3000, rechargement à chaud
```

```bash
docker compose exec web npm install <paquet>          # ajouter une dépendance
docker compose up --build -V                          # après un changement de dépendances
docker compose exec web npx tsx src/db/seed.ts        # données de démonstration
docker compose exec web npx drizzle-kit generate      # nouvelle migration après un changement de src/db/schema.ts
docker compose exec web npx tsc --noEmit              # vérifier les types
docker compose exec web npm run lint                  # vérifier le style
docker compose down                                   # arrêter
```

Les migrations sont appliquées automatiquement au démarrage du serveur (développement comme production). `data/` est créé à la demande.

Deux points à connaître en développement :

- Après une modification de `src/app/globals.css`, les nouvelles règles peuvent n'apparaître qu'après une seconde modification du fichier (par exemple un commentaire). Ce comportement du serveur de développement n'existe pas en production.
- Pour tester l'image de production sur le Mac : `docker compose -f compose.prod.yaml up -d --build`, puis arrêtez-la avant de relancer le mode développement.

---

## 10. Structure du projet

| Chemin | Rôle |
|---|---|
| `src/app/` | Pages et routes de l'application (accueil, `page/[id]`, `boite-a-outils`) |
| `src/app/api/` | Routes d'API : `search` (recherche), `export/[id]` (Markdown et zip), `health` (santé pour Docker) |
| `src/app/actions.ts` | Actions serveur (créer, renommer, déplacer, supprimer, enregistrer), validées avec zod |
| `src/components/` | Composants : arbre, éditeur Tiptap, bloc de code, palette de recherche |
| `src/db/` | Base de données : schéma, requêtes, mutations, préparation au démarrage, données de démonstration |
| `src/lib/` | Fonctions utilitaires : contenu Tiptap, Markdown, export, coloration du code |
| `src/instrumentation.ts` | Prépare la base au démarrage du serveur |
| `drizzle/` | Migrations de la base (commitées) |
| `data/` | La base de données SQLite (jamais commitée) |
| `Dockerfile`, `compose.prod.yaml`, `update.sh` | Production |
| `Dockerfile.dev`, `compose.yaml` | Développement |
| `PLAN.md`, `PLAN-CLAUDE-CODE.md` | Historique des étapes et règles de travail |
