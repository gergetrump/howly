#!/bin/bash
# Pull the latest commit on the EC2 host, refresh secrets, and restart the site.
set -euo pipefail

export HOME="${HOME:-/root}"

if [ ! -f /etc/howly.env ]; then
  echo "Missing /etc/howly.env. This script runs on the minimal EC2 instance."
  exit 1
fi

# shellcheck disable=SC1091
source /etc/howly.env

cd /opt/howly/app
git config --global --add safe.directory /opt/howly/app
git fetch origin "$GIT_REF"
git reset --hard "origin/$GIT_REF"

fetch_param() {
  aws ssm get-parameter \
    --region "$AWS_REGION" \
    --name "${PARAMETER_PREFIX}/$1" \
    --with-decryption \
    --query Parameter.Value \
    --output text
}

blank_if_unset() {
  if [ "$1" = "unset" ]; then
    printf ''
  else
    printf '%s' "$1"
  fi
}

public_url="$(fetch_param public_url)"
site_address="$(fetch_param site_address)"
acme_email="$(fetch_param acme_email)"
jwt_secret="$(fetch_param jwt_secret)"
smtp_username="$(blank_if_unset "$(fetch_param smtp_username)")"
smtp_password="$(blank_if_unset "$(fetch_param smtp_password)")"
smtp_from="$(fetch_param smtp_from)"
reviewer_email="$(blank_if_unset "$(fetch_param reviewer_email)")"
reviewer_password="$(blank_if_unset "$(fetch_param reviewer_password)")"

if [ -n "$smtp_username" ] && [ -n "$smtp_password" ]; then
  disable_email=false
else
  disable_email=true
fi

umask 077
cat > /opt/howly/app/backend/.env <<EOF
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb://mongo:27017/howly
TRUST_PROXY=true
JWT_SECRET=${jwt_secret}
SERVER_BASE_URL=${public_url}
FRONTEND_BASE_URL=${public_url}
DISABLE_EMAIL_SENDING=${disable_email}
SMTP_HOST=email-smtp.${AWS_REGION}.amazonaws.com
SMTP_PORT=587
SMTP_USER=${smtp_username}
SMTP_PASS=${smtp_password}
SMTP_FROM=${smtp_from}
REVIEWER_EMAIL=${reviewer_email}
REVIEWER_PASSWORD=${reviewer_password}
EOF

export PUBLIC_URL="$public_url"
export SITE_ADDRESS="$site_address"
export ACME_EMAIL="$acme_email"
export REVIEWER_EMAIL="$reviewer_email"
export REVIEWER_PASSWORD="$reviewer_password"
export HTTP_PORT=8080

compose() {
  docker compose -f docker-compose.prod.yml -f docker-compose.https.yml "$@"
}

compose up -d --build

for _ in $(seq 1 30); do
  if compose exec -T backend node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"; then
    compose exec -T backend node scripts/seed-reviewer.js
    exit 0
  fi
  sleep 5
done

echo "API did not become healthy." >&2
exit 1
