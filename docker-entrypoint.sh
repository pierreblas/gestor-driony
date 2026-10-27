#!/bin/sh
set -e

if [ -z "$AUTH_SECRET" ] || [ ${#AUTH_SECRET} -lt 16 ]; then
  echo "ERROR: falta AUTH_SECRET (mínimo 16 caracteres) en .env.production" >&2
  exit 1
fi
if [ -z "$MASTER_EMAIL" ]; then
  echo "AVISO: MASTER_EMAIL está vacío; no habrá cuenta master." >&2
fi

# Crea la base de datos la primera vez y aplica cambios de estructura sin borrar datos.
# Si un cambio fuese a perder datos, se detiene en lugar de aplicarlo.
echo "Preparando la base de datos en ${DATABASE_URL}..."
prisma db push --schema ./prisma/schema.prisma --skip-generate

echo "Driony escuchando en el puerto ${PORT} del contenedor"
exec node server.js
