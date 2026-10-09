#!/bin/sh
set -eu

: "${PORT:=8080}"

# If Railway has a Volume mounted at /data, use it automatically.
# If DATABASE_URL is supplied, Django uses PostgreSQL instead.
# If neither is available, keep the app bootable by falling back to writable local storage.
if [ -z "${DATABASE_URL:-}" ]; then
  VOLUME_PATH="${RAILWAY_VOLUME_MOUNT_PATH:-/data}"
  if [ -d "$VOLUME_PATH" ] && [ -w "$VOLUME_PATH" ]; then
    export RAILWAY_VOLUME_MOUNT_PATH="$VOLUME_PATH"
    mkdir -p "$VOLUME_PATH/media"
    if [ ! -f "$VOLUME_PATH/db.sqlite3" ] && [ -f /app/db.sqlite3 ]; then
      echo "[Bon-Bon] First run: copying initial SQLite database to $VOLUME_PATH"
      cp /app/db.sqlite3 "$VOLUME_PATH/db.sqlite3"
    fi
  else
    export INSTA_KIDS_DATA_PATH=/tmp/instakids-data
    mkdir -p "$INSTA_KIDS_DATA_PATH/media"
    if [ ! -f "$INSTA_KIDS_DATA_PATH/db.sqlite3" ] && [ -f /app/db.sqlite3 ]; then
      echo "[Bon-Bon] First run: copying initial SQLite database to fallback storage"
      cp /app/db.sqlite3 "$INSTA_KIDS_DATA_PATH/db.sqlite3"
    fi
    echo "[Bon-Bon] WARNING: no Railway Volume or DATABASE_URL detected. Starting with temporary SQLite storage at $INSTA_KIDS_DATA_PATH; data can be lost when the container is replaced."
  fi
fi

if [ -n "${DATABASE_URL:-}" ]; then
  echo "[Bon-Bon] Database: PostgreSQL"
else
  echo "[Bon-Bon] Database: SQLite (${RAILWAY_VOLUME_MOUNT_PATH:-${INSTA_KIDS_DATA_PATH:-/app}})"
  if [ -z "${RAILWAY_VOLUME_MOUNT_PATH:-}" ]; then
    echo "[Bon-Bon] WARNING: no Railway Volume detected; SQLite data will be ephemeral."
  fi
fi

python manage.py migrate --noinput

# SQLite is kept to one worker to avoid multi-process write locks.
if [ -n "${DATABASE_URL:-}" ]; then
  WORKERS="${WEB_CONCURRENCY:-3}"
else
  WORKERS=1
fi

# Start Django first; nginx healthcheck will fail until Django is ready.
gunicorn config.wsgi:application \
  --bind 127.0.0.1:8000 \
  --worker-class gthread \
  --workers "$WORKERS" \
  --threads "${GUNICORN_THREADS:-32}" \
  --timeout 120 \
  --graceful-timeout 30 \
  --keep-alive 75 \
  --max-requests 2000 \
  --max-requests-jitter 200 \
  --access-logfile - \
  --error-logfile - &
GUNICORN_PID=$!

cleanup() {
  kill "$GUNICORN_PID" 2>/dev/null || true
  wait "$GUNICORN_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# Let nginx be the public process and keep the container alive.
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf
nginx -t
nginx -g 'daemon off;'
