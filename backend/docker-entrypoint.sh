#!/bin/sh
set -eu

mkdir -p /tmp
chmod 1777 /tmp

if [ -n "${MONGO_CA_CERT:-}" ]; then
    printf '%s\n' "$MONGO_CA_CERT" > /tmp/mongo-ca.pem
    chmod 644 /tmp/mongo-ca.pem
    export NODE_EXTRA_CA_CERTS=/tmp/mongo-ca.pem
fi

exec su-exec node "$@"
