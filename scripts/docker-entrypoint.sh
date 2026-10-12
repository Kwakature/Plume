#!/bin/sh
# Démarre le conteneur en root le temps de préparer les dossiers de données,
# puis laisse la main à l'utilisateur « node » (sans droits particuliers).
set -e

if [ "$(id -u)" = "0" ]; then
  # data/ est monté depuis le Raspberry : selon qui l'a créé, son propriétaire
  # peut différer de « node ». On règle ça ici, une fois pour toutes.
  mkdir -p /app/data
  chown -R node:node /app/data
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
