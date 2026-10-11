#!/bin/bash
# Idempotent replica-set bootstrap. Reads secrets on the instance; this document has no passwords.
set -euo pipefail
export HOME=/root

token="$(curl -fsS -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")"
region="$(curl -fsS -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/placement/region)"
secret() {
  aws secretsmanager get-secret-value --region "$region" --secret-id "$1" --query SecretString --output text
}

ready=0
for _ in $(seq 1 90); do
  if docker exec mongo mongosh --quiet --tls --tlsCAFile /data/ca.pem --eval 'db.runCommand({ ping: 1 }).ok' | grep -q 1; then
    ready=1
    break
  fi
  sleep 10
done
if [ "$ready" != 1 ]; then
  echo "MongoDB did not accept TLS connections." >&2
  exit 1
fi

app_pass="$(secret howly/mongo-password)"
ops_pass="$(secret howly/mongo-ops-password)"

configured=0
for _ in $(seq 1 30); do
  if ! docker exec -e OPS_PASS="$ops_pass" mongo mongosh --quiet --tls --tlsCAFile /data/ca.pem \
    -u howly-ops -p "$ops_pass" --authenticationDatabase admin --eval 'db.runCommand({ ping: 1 }).ok' | grep -q 1; then
    docker exec -e OPS_PASS="$ops_pass" mongo mongosh --quiet --tls --tlsCAFile /data/ca.pem --eval '
const opsPass = process.env.OPS_PASS;
let initiated = false;
try { rs.status(); initiated = true; } catch (e) { initiated = false; }
if (!initiated) {
  rs.initiate({
    _id: "howly",
    members: [
      { _id: 0, host: "mongo-0.howly.internal:27017" },
      { _id: 1, host: "mongo-1.howly.internal:27017" },
      { _id: 2, host: "mongo-2.howly.internal:27017" }
    ]
  });
}
const admin = db.getSiblingDB("admin");
if (!admin.getUser("howly-ops")) {
  admin.createUser({ user: "howly-ops", pwd: opsPass, roles: [{ role: "root", db: "admin" }] });
}
print("bootstrapped");
' || true
  fi

  if docker exec -e APP_PASS="$app_pass" -e OPS_PASS="$ops_pass" mongo mongosh --quiet --tls --tlsCAFile /data/ca.pem \
    -u howly-ops -p "$ops_pass" --authenticationDatabase admin --eval '
const appPass = process.env.APP_PASS;
const app = db.getSiblingDB("howly");
if (!app.getUser("howly")) {
  app.createUser({ user: "howly", pwd: appPass, roles: [{ role: "readWrite", db: "howly" }] });
}
const hosts = rs.conf().members.map((member) => member.host);
if (!hosts.some((host) => host.startsWith("mongo-3."))) {
  rs.add({
    host: "mongo-3.howly.internal:27017",
    priority: 0,
    hidden: true,
    votes: 0,
    secondaryDelaySecs: 3600
  });
}
print("ready");
' | grep -q ready; then
    configured=1
    break
  fi
  sleep 10
done

if [ "$configured" != 1 ]; then
  echo "MongoDB replica set was not ready." >&2
  exit 1
fi
