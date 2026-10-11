#!/bin/bash
# Operator-started promotion of the Ireland member.
#
# Default path, when Frankfurt still answers:
#   disable the streak schedules, stop streak tasks that are already running,
#   scale the Frankfurt API to zero, and only then call Frankfurt fenced.
#   Refuse if Ireland is further behind than maxLagSeconds. Catch Ireland up
#   while it still cannot be elected, then make it the only voter.
#   Frankfurt stays stopped. DNS does not move.
# If that fence does not stick, the script stops and puts the API count and
# the schedules back. allowUnfencedPromotion=true skips the fence. Use it only
# after Frankfurt is confirmed unable to accept writes. That path
# force-reconfigures and can roll back committed writes.
set -euo pipefail
export HOME=/root

# Tests source this file. They set the variables below and stop before IMDS.
if [ "${RESTORE_STANDBY_SOURCE_ONLY:-}" != "1" ]; then
  MAX_LAG_SECONDS="{{ maxLagSeconds }}"
  ALLOW_UNFENCED="{{ allowUnfencedPromotion }}"
  export FRANKFURT_REGION="{{ frankfurtRegion }}"
  ECS_CLUSTER="{{ ecsCluster }}"
  ECS_SERVICE="{{ ecsService }}"
  FRANKFURT_DESIRED="{{ frankfurtDesiredCount }}"
  DAILY_SCHEDULE="{{ dailySchedule }}"
  REMINDER_SCHEDULE="{{ reminderSchedule }}"
  SCHEDULER_FAMILY="{{ schedulerFamily }}"

  case "$MAX_LAG_SECONDS" in
    ''|*[!0-9]*) echo "maxLagSeconds must be a positive integer." >&2; exit 1 ;;
  esac
  case "$FRANKFURT_DESIRED" in
    ''|*[!0-9]*) echo "frankfurtDesiredCount must be a whole number." >&2; exit 1 ;;
  esac
  case "$SCHEDULER_FAMILY" in
    ''|*[!A-Za-z0-9_-]*) echo "schedulerFamily must be a task family name." >&2; exit 1 ;;
  esac
  if [ "$ALLOW_UNFENCED" != "true" ] && [ "$ALLOW_UNFENCED" != "false" ]; then
    echo "allowUnfencedPromotion must be true or false." >&2
    exit 1
  fi
fi

FENCE_ATTEMPTS="${FENCE_ATTEMPTS:-60}"
FENCE_SLEEP_SECONDS="${FENCE_SLEEP_SECONDS:-10}"

secret() {
  aws secretsmanager get-secret-value --region "$region" --secret-id "$1" --query SecretString --output text
}

mongo_local() {
  docker exec -i -e OPS_PASS="$ops_pass" -e APP_PASS="$app_pass" mongo \
    mongosh --quiet --tls --tlsCAFile /data/ca.pem \
    -u howly-ops -p "$ops_pass" --authenticationDatabase admin
}

mongo_primary() {
  docker exec -i -e OPS_PASS="$ops_pass" -e APP_PASS="$app_pass" mongo \
    mongosh --quiet --tls --tlsCAFile /data/ca.pem \
    --host "$1" \
    -u howly-ops -p "$ops_pass" --authenticationDatabase admin
}

json_line() {
  printf '%s\n' "$1" | awk '/^\{/ { line = $0 } END { print line }'
}

read_status() {
  json_line "$(mongo_local <<'JS'
const status = rs.status();
const self = status.members.find((member) => member.self);
const primary = status.members.find((member) => member.stateStr === "PRIMARY");
let reachable = false;
let lagSeconds = -1;
let primaryHost = "";
if (primary && primary.optimeDate && self && self.optimeDate) {
  const heartbeat = primary.lastHeartbeat ? primary.lastHeartbeat.getTime() : 0;
  reachable = Boolean(primary.self) || (Date.now() - heartbeat) < 60000;
  lagSeconds = Math.max(0, Math.round((primary.optimeDate.getTime() - self.optimeDate.getTime()) / 1000));
  primaryHost = primary.name;
}
const ageSeconds = self && self.optimeDate
  ? Math.max(0, Math.round((Date.now() - self.optimeDate.getTime()) / 1000))
  : -1;
print(JSON.stringify({
  reachable,
  lagSeconds,
  ageSeconds,
  primaryHost,
  selfState: self ? self.stateStr : ""
}));
JS
)"
}

set_schedule_state() {
  SCHEDULE_NAME="$1" SCHEDULE_STATE="$2" python3 - <<'PY'
import json, os, subprocess
name = os.environ["SCHEDULE_NAME"]
region = os.environ["FRANKFURT_REGION"]
state = os.environ["SCHEDULE_STATE"]
raw = subprocess.check_output([
    "aws", "scheduler", "get-schedule",
    "--region", region,
    "--name", name,
])
current = json.loads(raw)
payload = {
    "Name": current["Name"],
    "ScheduleExpression": current["ScheduleExpression"],
    "FlexibleTimeWindow": current["FlexibleTimeWindow"],
    "Target": current["Target"],
    "State": state,
}
for key in ("ScheduleExpressionTimezone", "ActionAfterCompletion", "Description", "GroupName", "KmsKeyArn", "StartDate", "EndDate"):
    if key in current and current[key] not in (None, ""):
        payload[key] = current[key]
subprocess.check_call([
    "aws", "scheduler", "update-schedule",
    "--region", region,
    "--cli-input-json", json.dumps(payload),
])
PY
}

disable_schedules() {
  schedules_disabled=1
  set_schedule_state "$DAILY_SCHEDULE" DISABLED
  set_schedule_state "$REMINDER_SCHEDULE" DISABLED
  for name in "$DAILY_SCHEDULE" "$REMINDER_SCHEDULE"; do
    state="$(aws scheduler get-schedule --region "$FRANKFURT_REGION" --name "$name" --query State --output text)"
    if [ "$state" != "DISABLED" ]; then
      echo "Frankfurt schedule $name is $state, not DISABLED." >&2
      return 1
    fi
  done
}

enable_schedules() {
  set_schedule_state "$DAILY_SCHEDULE" ENABLED || return 1
  set_schedule_state "$REMINDER_SCHEDULE" ENABLED || return 1
  schedules_disabled=0
}

scheduler_task_arns() {
  local status="$1"
  local raw
  raw="$(aws ecs list-tasks \
    --region "$FRANKFURT_REGION" \
    --cluster "$ECS_CLUSTER" \
    --family "$SCHEDULER_FAMILY" \
    --desired-status "$status" \
    --query 'taskArns[]' \
    --output text)" || return 1
  printf '%s\n' "$raw" | tr '\t' '\n' | awk 'NF && $0 != "None"'
}

collect_scheduler_tasks() {
  local running pending
  running="$(scheduler_task_arns RUNNING)" || return 1
  pending="$(scheduler_task_arns PENDING)" || return 1
  printf '%s\n%s\n' "$running" "$pending" | awk 'NF && $0 != "None"' | sort -u
}

task_last_status() {
  aws ecs describe-tasks \
    --region "$FRANKFURT_REGION" \
    --cluster "$ECS_CLUSTER" \
    --tasks "$1" \
    --query 'tasks[0].lastStatus' \
    --output text
}

# Remember ARNs in a newline-delimited string. ARNs do not contain newlines.
remember_task() {
  case "$seen_tasks" in
    *"
$1
"*) ;;
    *) seen_tasks="${seen_tasks}${1}
" ;;
  esac
}

stop_scheduler_tasks() {
  local clean=0
  local attempt arns arn last pending_stop
  seen_tasks="
"
  for attempt in $(seq 1 "$FENCE_ATTEMPTS"); do
    arns="$(collect_scheduler_tasks)" || return 1
    pending_stop=0
    if [ -n "$arns" ]; then
      while IFS= read -r arn; do
        [ -n "$arn" ] || continue
        case "$seen_tasks" in
          *"
$arn
"*) ;;
          *)
            aws ecs stop-task \
              --region "$FRANKFURT_REGION" \
              --cluster "$ECS_CLUSTER" \
              --task "$arn" \
              --reason "howly-restore-standby fence" >/dev/null || return 1
            remember_task "$arn"
            ;;
        esac
      done <<< "$arns"
      pending_stop=1
    fi
    while IFS= read -r arn; do
      [ -n "$arn" ] || continue
      last="$(task_last_status "$arn")" || return 1
      if [ "$last" != "STOPPED" ] && [ "$last" != "None" ]; then
        pending_stop=1
      fi
    done <<< "$seen_tasks"
    if [ "$pending_stop" = 0 ]; then
      clean=$((clean + 1))
      if [ "$clean" -ge 2 ]; then
        return 0
      fi
    else
      clean=0
    fi
    sleep "$FENCE_SLEEP_SECONDS"
  done
  echo "Frankfurt scheduler tasks are still running." >&2
  return 1
}

stop_frankfurt_api() {
  aws ecs update-service \
    --region "$FRANKFURT_REGION" \
    --cluster "$ECS_CLUSTER" \
    --service "$ECS_SERVICE" \
    --desired-count 0 >/dev/null || return 1
  # Set before the wait. A timeout still has to restore this count.
  api_scaled=1
  local attempt counts running desired pending
  for attempt in $(seq 1 "$FENCE_ATTEMPTS"); do
    counts="$(aws ecs describe-services \
      --region "$FRANKFURT_REGION" \
      --cluster "$ECS_CLUSTER" \
      --services "$ECS_SERVICE" \
      --query 'services[0].[runningCount,desiredCount,pendingCount]' \
      --output text)" || return 1
    read -r running desired pending <<< "$counts"
    if [ "$running" = "0" ] && [ "$desired" = "0" ] && [ "$pending" = "0" ]; then
      return 0
    fi
    sleep "$FENCE_SLEEP_SECONDS"
  done
  echo "Frankfurt API tasks are still running." >&2
  return 1
}

start_frankfurt_api() {
  aws ecs update-service \
    --region "$FRANKFURT_REGION" \
    --cluster "$ECS_CLUSTER" \
    --service "$ECS_SERVICE" \
    --desired-count "$FRANKFURT_DESIRED" >/dev/null
}

restore_ireland_member() {
  mongo_primary "$primary_host" <<'JS'
const cfg = rs.conf();
cfg.members.forEach((member) => {
  if (member.host.startsWith("mongo-3.")) {
    member.priority = 0;
    member.votes = 0;
    member.hidden = true;
    member.secondaryDelaySecs = 3600;
  }
});
rs.reconfig(cfg);
print("restored");
JS
  ireland_changed=0
}

unfence() {
  if [ "$schedules_disabled" = 1 ]; then
    enable_schedules || echo "Could not re-enable the Frankfurt streak schedules." >&2
  fi
  if [ "$api_scaled" = 1 ]; then
    start_frankfurt_api || echo "Could not scale the Frankfurt API back to ${FRANKFURT_DESIRED}." >&2
    api_scaled=0
  fi
  fenced=0
}

fence_frankfurt() {
  echo "Stopping Frankfurt streak schedules, streak tasks already running, and API tasks."
  disable_schedules || return 1
  stop_scheduler_tasks || return 1
  stop_frankfurt_api || return 1
  fenced=1
}

cleanup() {
  status=$?
  if [ "$promoted" = 1 ]; then
    exit "$status"
  fi
  if [ "$point_of_no_return" = 1 ]; then
    echo "Promotion stopped after Frankfurt was fenced. Writers stay stopped so the old primary cannot accept new data." >&2
    exit "$status"
  fi
  if [ "$ireland_changed" = 1 ] && [ -n "$primary_host" ]; then
    restore_ireland_member || echo "Could not restore the Ireland member to a delayed secondary." >&2
  fi
  if [ "$fenced" = 1 ] || [ "$api_scaled" = 1 ] || [ "$schedules_disabled" = 1 ]; then
    echo "Restoring Frankfurt writers." >&2
    unfence || true
  fi
  exit "$status"
}

if [ "${RESTORE_STANDBY_SOURCE_ONLY:-}" = "1" ]; then
  return 0 2>/dev/null || exit 0
fi

token="$(curl -fsS -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")"
imds() { curl -fsS -H "X-aws-ec2-metadata-token: $token" "http://169.254.169.254/latest/$1"; }
region="$(imds meta-data/placement/region)"
index="$(imds meta-data/tags/instance/MongoIndex)"
export REGION="$region"

if [ "$index" != "3" ]; then
  echo "howly-restore-standby only runs on the Ireland member (MongoIndex 3)." >&2
  exit 1
fi

app_pass="$(secret howly/mongo-password)"
ops_pass="$(secret howly/mongo-ops-password)"
export APP_PASS="$app_pass"

promoted=0
fenced=0
api_scaled=0
schedules_disabled=0
ireland_changed=0
point_of_no_return=0
primary_host=""
seen_tasks=""

trap cleanup EXIT

for _ in $(seq 1 30); do
  if docker exec mongo mongosh --quiet --tls --tlsCAFile /data/ca.pem --eval 'db.runCommand({ ping: 1 }).ok' | grep -q 1; then
    break
  fi
  sleep 5
done

status_json="$(read_status)"
reachable="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["reachable"])' "$status_json")"
lag_seconds="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["lagSeconds"])' "$status_json")"
age_seconds="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["ageSeconds"])' "$status_json")"
primary_host="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["primaryHost"])' "$status_json")"
self_state="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["selfState"])' "$status_json")"

if [ "$self_state" = "PRIMARY" ] && [ "$reachable" = "True" ]; then
  echo "Ireland is already primary. Checking the canary and storing the connection string."
  point_of_no_return=1
else
  if [ "$reachable" != "True" ]; then
    if [ "$ALLOW_UNFENCED" != "true" ]; then
      echo "Frankfurt has no fresh primary heartbeat, so writes there cannot be stopped from Ireland." >&2
      echo "Refusing to promote. If Frankfurt is confirmed down, re-run with allowUnfencedPromotion=true." >&2
      exit 1
    fi
    if [ "$age_seconds" -lt 0 ] || [ "$age_seconds" -gt "$MAX_LAG_SECONDS" ]; then
      echo "Ireland's last applied write is ${age_seconds}s old. The limit is ${MAX_LAG_SECONDS}s. Refusing to promote." >&2
      exit 1
    fi
    echo "WARNING: promoting without a fence. Forced reconfiguration can roll back committed writes."
    mongo_local <<'JS'
const cfg = rs.conf();
const self = cfg.members.find((member) => member.host.startsWith("mongo-3."));
if (!self) {
  throw new Error("Ireland member is missing from the replica set config.");
}
cfg.members = [{
  _id: self._id,
  host: self.host,
  priority: 1,
  hidden: false,
  votes: 1,
  secondaryDelaySecs: 0
}];
rs.reconfig(cfg, { force: true });
print("forced");
JS
    point_of_no_return=1
  else
    if [ "$lag_seconds" -gt "$MAX_LAG_SECONDS" ]; then
      echo "Ireland is ${lag_seconds}s behind Frankfurt. The limit is ${MAX_LAG_SECONDS}s. Refusing to promote." >&2
      exit 1
    fi

    if ! fence_frankfurt; then
      exit 1
    fi

    status_json="$(read_status)"
    lag_seconds="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["lagSeconds"])' "$status_json")"
    if [ "$lag_seconds" -gt "$MAX_LAG_SECONDS" ]; then
      echo "Ireland is ${lag_seconds}s behind Frankfurt after writes stopped. The limit is ${MAX_LAG_SECONDS}s." >&2
      exit 1
    fi

    echo "Catching Ireland up. It stays non-voting until the lag is gone, so it cannot be elected early."
    mongo_primary "$primary_host" <<'JS'
const cfg = rs.conf();
cfg.members.forEach((member) => {
  if (member.host.startsWith("mongo-3.")) {
    member.votes = 0;
    member.priority = 0;
    member.hidden = false;
    member.secondaryDelaySecs = 0;
  }
});
rs.reconfig(cfg);
print("catching-up");
JS
    ireland_changed=1

    caught_up=0
    for _ in $(seq 1 60); do
      status_json="$(read_status)"
      reachable="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["reachable"])' "$status_json")"
      lag_seconds="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["lagSeconds"])' "$status_json")"
      primary_host="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["primaryHost"])' "$status_json")"
      if [ "$reachable" = "True" ] && [ "$lag_seconds" -ge 0 ] && [ "$lag_seconds" -le 15 ]; then
        caught_up=1
        break
      fi
      sleep 10
    done
    if [ "$caught_up" != 1 ]; then
      echo "Ireland did not catch up within 10 minutes." >&2
      exit 1
    fi

    mongo_primary "$primary_host" <<'JS'
const cfg = rs.conf();
cfg.members.forEach((member) => {
  if (member.host.startsWith("mongo-3.")) {
    member.votes = 1;
    member.hidden = false;
    member.priority = 1;
    member.secondaryDelaySecs = 0;
  }
});
rs.reconfig(cfg);
print("electable");
JS
    point_of_no_return=1
    echo "Ireland is caught up. Moving the primary and removing Frankfurt votes."
    mongo_primary "$primary_host" <<'JS'
const cfg = rs.conf();
cfg.members.forEach((member) => {
  if (!member.host.startsWith("mongo-3.")) {
    member.priority = 0;
  }
});
rs.reconfig(cfg);
print("priorities-lowered");
JS
    mongo_primary "$primary_host" <<'JS' || true
try {
  rs.stepDown(60);
} catch (error) {
  print(String(error));
}
JS

    became_primary=0
    for _ in $(seq 1 30); do
      status_json="$(read_status)"
      self_state="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["selfState"])' "$status_json")"
      if [ "$self_state" = "PRIMARY" ]; then
        became_primary=1
        break
      fi
      sleep 5
    done
    if [ "$became_primary" != 1 ]; then
      echo "Ireland did not become primary." >&2
      exit 1
    fi

    for _ in $(seq 1 5); do
      result="$(mongo_local <<'JS'
const cfg = rs.conf();
let changed = false;
for (const member of cfg.members) {
  if (!member.host.startsWith("mongo-3.") && member.votes !== 0) {
    member.votes = 0;
    member.priority = 0;
    changed = true;
    break;
  }
}
if (changed) {
  rs.reconfig(cfg);
  print("removed-one");
} else {
  print("votes-clear");
}
JS
)"
      if printf '%s\n' "$result" | grep -q votes-clear; then
        break
      fi
    done
    if ! printf '%s\n' "$result" | grep -q votes-clear; then
      echo "Frankfurt members still have votes." >&2
      exit 1
    fi
  fi
fi

ready=0
for _ in $(seq 1 15); do
  status_json="$(read_status)"
  self_state="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["selfState"])' "$status_json")"
  if [ "$self_state" = "PRIMARY" ]; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" != 1 ]; then
  echo "Ireland is not primary." >&2
  exit 1
fi

docker exec -i -e APP_PASS="$app_pass" mongo \
  mongosh --quiet --tls --tlsCAFile /data/ca.pem \
  -u howly -p "$app_pass" --authenticationDatabase howly howly <<'JS'
const id = new ObjectId();
db.failover_canary.insertOne({ _id: id, at: new Date(), source: "ireland-restore" });
const found = db.failover_canary.findOne({ _id: id });
if (!found) {
  throw new Error("Canary read failed.");
}
print("canary-ok");
JS

python3 - <<'PY'
import os, subprocess
uri = "mongodb://howly:%s@mongo-3.howly.internal:27017/howly?authSource=howly&tls=true" % os.environ["APP_PASS"]
subprocess.run([
    "aws", "secretsmanager", "put-secret-value",
    "--region", os.environ["REGION"],
    "--secret-id", "howly/mongo-uri",
    "--secret-string", uri,
], check=True)
PY
unset APP_PASS app_pass ops_pass
promoted=1

echo "Ireland is primary and the canary write succeeded."
if [ "$fenced" = 1 ]; then
  echo "Frankfurt API tasks and streak schedules stay stopped, and its database members cannot vote."
elif [ "$ALLOW_UNFENCED" = "true" ]; then
  echo "Frankfurt was not fenced. Do not start its API, schedules, or database."
else
  echo "Ireland was already primary. Confirm Frankfurt writers are stopped before publishing DNS."
fi
echo "DNS stays on Frankfurt until you apply -var standby_restore_confirmed=restored -var standby_desired_count=1 -var enable_region_failover=true"
