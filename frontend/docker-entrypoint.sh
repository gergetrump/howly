#!/bin/sh
set -eu

upstream="${BACKEND_UPSTREAM:-http://backend:3000}"

case "$upstream" in
  http://*|https://*) ;;
  *) upstream="http://${upstream}" ;;
esac

upstream="${upstream%/}"
export BACKEND_UPSTREAM="$upstream"

if [ "$#" -eq 0 ]; then
  set -- nginx -g 'daemon off;'
fi

exec /docker-entrypoint.sh "$@"
