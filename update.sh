#!/bin/sh
# Met à jour la production : récupère le code, reconstruit l'image, relance.
# Les données (data/) ne sont pas touchées ; les migrations s'appliquent au démarrage.
set -e
cd "$(dirname "$0")"

git pull --ff-only
docker compose -f compose.prod.yaml up -d --build
# Supprime les anciennes images devenues inutiles (libère de la place sur la carte SD).
docker image prune -f
docker compose -f compose.prod.yaml ps
