#!/bin/sh
# Copia nocturna de PostgreSQL (formato custom de pg_dump). Se ejecuta en el contenedor "backup".
# Guarda BACKUP_KEEP copias en /backups y borra las más antiguas.
set -e
echo "[backup] en marcha. Copia diaria a las 04:30 (Europe/Madrid), se guardan ${BACKUP_KEEP:-14}."
while true; do
    if [ "$(date +%H%M)" = "0430" ]; then
        f="/backups/elpueblo-$(date +%F).dump"
        PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h postgres -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "$f.tmp"
        mv "$f.tmp" "$f"
        echo "[backup] copia $f"
        ls -1t /backups/elpueblo-*.dump | tail -n +$(( ${BACKUP_KEEP:-14} + 1 )) | xargs -r rm -f
        sleep 60
    fi
    sleep 30
done
