#!/bin/bash
# Boot a MongoDB replica-set member. The image digest is substituted by Terraform.
# Region and member index come from the instance itself. Passwords stay in Secrets Manager.
set -euo pipefail
export HOME=/root

token="$(curl -fsS -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")"
imds() { curl -fsS -H "X-aws-ec2-metadata-token: $token" "http://169.254.169.254/latest/$1"; }
region="$(imds meta-data/placement/region)"
index="$(imds meta-data/tags/instance/MongoIndex)"
instance_id="$(imds meta-data/instance-id)"
account="$(imds dynamic/instance-identity/document | python3 -c 'import json,sys; print(json.load(sys.stdin)["accountId"])')"
export REGION="$region"

dnf install -y docker amazon-cloudwatch-agent openssl python3
systemctl enable --now docker

data_dev=""
for _ in $(seq 1 60); do
  for dev in /dev/nvme*n1 /dev/xvdf; do
    [ -b "$dev" ] || continue
    [ "$dev" = "/dev/nvme0n1" ] && continue
    data_dev="$dev"
    break
  done
  [ -n "$data_dev" ] && break
  sleep 2
done
if [ -z "$data_dev" ]; then
  echo "MongoDB data volume did not appear." >&2
  exit 1
fi
if ! blkid "$data_dev" >/dev/null 2>&1; then
  mkfs.xfs "$data_dev"
fi
mkdir -p /var/lib/howly-mongo
uuid="$(blkid -s UUID -o value "$data_dev")"
grep -q /var/lib/howly-mongo /etc/fstab || echo "UUID=${uuid} /var/lib/howly-mongo xfs defaults,nofail 0 2" >> /etc/fstab
mountpoint -q /var/lib/howly-mongo || mount /var/lib/howly-mongo

install -d -m 700 /etc/howly-mongo
fetch_secret() {
  aws secretsmanager get-secret-value --region "$region" --secret-id "$1" --query SecretString --output text
}

umask 077
keyfile_ok=0
for _ in $(seq 1 60); do
  if fetch_secret howly/mongo-keyfile >/etc/howly-mongo/keyfile 2>/dev/null && [ -s /etc/howly-mongo/keyfile ]; then
    keyfile_ok=1
    break
  fi
  sleep 10
done
if [ "$keyfile_ok" != 1 ]; then
  echo "MongoDB keyfile was not available." >&2
  exit 1
fi

write_tls_files() {
  python3 - <<'PY'
import json, pathlib
bundle = json.loads(pathlib.Path("/tmp/mongo-tls.json").read_text())
base = pathlib.Path("/etc/howly-mongo")
base.joinpath("ca.pem").write_text(bundle["ca"])
base.joinpath("server.key").write_text(bundle["key"])
base.joinpath("server.pem").write_text(bundle["cert"] + "\n" + bundle["key"])
if bundle.get("caKey"):
    base.joinpath("ca.key").write_text(bundle["caKey"])
PY
}

if [ "$index" = "0" ]; then
  if ! fetch_secret howly/mongo-tls >/tmp/mongo-tls.json 2>/dev/null || [ ! -s /tmp/mongo-tls.json ]; then
    openssl req -x509 -newkey rsa:2048 -nodes \
      -keyout /etc/howly-mongo/ca.key \
      -out /etc/howly-mongo/ca.pem \
      -days 3650 \
      -subj "/CN=howly-mongo-ca"
    cat >/etc/howly-mongo/san.cnf <<'EOF'
[req]
distinguished_name = dn
req_extensions = v3
prompt = no
[dn]
CN = mongo.howly.internal
[v3]
subjectAltName = DNS:localhost,DNS:mongo-0.howly.internal,DNS:mongo-1.howly.internal,DNS:mongo-2.howly.internal,DNS:mongo-3.howly.internal,IP:127.0.0.1
extendedKeyUsage = serverAuth, clientAuth
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
EOF
    openssl req -newkey rsa:2048 -nodes \
      -keyout /etc/howly-mongo/server.key \
      -out /etc/howly-mongo/server.csr \
      -config /etc/howly-mongo/san.cnf
    openssl x509 -req \
      -in /etc/howly-mongo/server.csr \
      -CA /etc/howly-mongo/ca.pem \
      -CAkey /etc/howly-mongo/ca.key \
      -CAcreateserial \
      -out /etc/howly-mongo/server.crt \
      -days 825 \
      -extfile /etc/howly-mongo/san.cnf \
      -extensions v3
    cat /etc/howly-mongo/server.crt /etc/howly-mongo/server.key > /etc/howly-mongo/server.pem
    python3 - <<'PY'
import json, os, pathlib, subprocess
payload = json.dumps({
    "ca": pathlib.Path("/etc/howly-mongo/ca.pem").read_text(),
    "cert": pathlib.Path("/etc/howly-mongo/server.crt").read_text(),
    "key": pathlib.Path("/etc/howly-mongo/server.key").read_text(),
    "caKey": pathlib.Path("/etc/howly-mongo/ca.key").read_text(),
})
subprocess.run([
    "aws", "secretsmanager", "put-secret-value",
    "--region", os.environ["REGION"],
    "--secret-id", "howly/mongo-tls",
    "--secret-string", payload,
], check=True)
PY
  else
    write_tls_files
  fi
else
  ok=0
  for _ in $(seq 1 90); do
    if fetch_secret howly/mongo-tls >/tmp/mongo-tls.json 2>/dev/null && [ -s /tmp/mongo-tls.json ]; then
      ok=1
      break
    fi
    sleep 10
  done
  if [ "$ok" != 1 ]; then
    echo "MongoDB TLS material was not published." >&2
    exit 1
  fi
  write_tls_files
fi

chown 999:999 /etc/howly-mongo/keyfile /etc/howly-mongo/server.pem /etc/howly-mongo/ca.pem
chmod 400 /etc/howly-mongo/keyfile /etc/howly-mongo/server.pem
chmod 444 /etc/howly-mongo/ca.pem
rm -f /tmp/mongo-tls.json

image="${account}.dkr.ecr.${region}.amazonaws.com/howly-mongo@__MONGO_IMAGE_DIGEST__"
for _ in $(seq 1 30); do
  if aws ecr get-login-password --region "$region" | docker login --username AWS --password-stdin "${account}.dkr.ecr.${region}.amazonaws.com" \
    && docker pull "$image"; then
    break
  fi
  sleep 10
done
docker image inspect "$image" >/dev/null

docker rm -f mongo >/dev/null 2>&1 || true
docker run -d --name mongo --restart always \
  -p 27017:27017 \
  -v /var/lib/howly-mongo:/data/db \
  -v /etc/howly-mongo/keyfile:/data/keyfile:ro \
  -v /etc/howly-mongo/server.pem:/data/server.pem:ro \
  -v /etc/howly-mongo/ca.pem:/data/ca.pem:ro \
  "$image" \
  --replSet howly \
  --bind_ip_all \
  --keyFile /data/keyfile \
  --auth \
  --tlsMode requireTLS \
  --tlsCertificateKeyFile /data/server.pem \
  --tlsCAFile /data/ca.pem \
  --tlsAllowConnectionsWithoutCertificates

cat >/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<'EOF'
{
  "metrics": {
    "namespace": "CWAgent",
    "append_dimensions": { "InstanceId": "${aws:InstanceId}" },
    "metrics_collected": {
      "disk": {
        "measurement": ["used_percent"],
        "resources": ["/var/lib/howly-mongo"]
      },
      "mem": { "measurement": ["mem_used_percent"] }
    }
  }
}
EOF
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

cat >/usr/local/bin/howly-mongo-metrics <<EOF
#!/bin/bash
set -euo pipefail
id="$instance_id"
region="$region"
running=0
if docker inspect -f '{{.State.Running}}' mongo 2>/dev/null | grep -qx true; then
  running=1
fi
disk=\$(df -P /var/lib/howly-mongo | awk 'NR==2 { gsub("%","",\$5); print \$5 }')
mem=\$(awk '/MemTotal/ {t=\$2} /MemAvailable/ {a=\$2} END { if (t>0) printf "%.1f", (t-a)/t*100; else print 0 }' /proc/meminfo)
aws cloudwatch put-metric-data --region "\$region" --namespace Howly/Mongo --metric-name ContainerRunning --dimensions InstanceId="\$id" --value "\$running"
aws cloudwatch put-metric-data --region "\$region" --namespace Howly/Mongo --metric-name DiskUsedPercent --dimensions InstanceId="\$id" --value "\$disk"
aws cloudwatch put-metric-data --region "\$region" --namespace Howly/Mongo --metric-name MemoryUsedPercent --dimensions InstanceId="\$id" --value "\$mem"
EOF
chmod 755 /usr/local/bin/howly-mongo-metrics
cat >/etc/systemd/system/howly-mongo-metrics.service <<'EOF'
[Service]
Type=oneshot
ExecStart=/usr/local/bin/howly-mongo-metrics
EOF
cat >/etc/systemd/system/howly-mongo-metrics.timer <<'EOF'
[Timer]
OnBootSec=2min
OnUnitActiveSec=1min
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now howly-mongo-metrics.timer
