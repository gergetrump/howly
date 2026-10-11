#!/bin/bash
# Exercises the fence helpers with a fake aws CLI.
# A scale-down that times out must still restore the API count.
# Running scheduler tasks must be stopped before the API is scaled down.
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

cat > "$tmpdir/aws" << 'EOF'
#!/bin/bash
printf '%s\n' "$*" >> "$AWS_MOCK_LOG"
joined="$*"
if [[ "$joined" == *get-schedule* && "$joined" == *--query* && "$joined" == *State* ]]; then
  printf '%s\n' DISABLED
  exit 0
fi
if [[ "$joined" == *get-schedule* ]]; then
  printf '%s\n' '{"Name":"howly-streak-daily","ScheduleExpression":"cron(30 0 * * ? *)","FlexibleTimeWindow":{"Mode":"OFF"},"Target":{"Arn":"arn:aws:ecs:eu-central-1:1:cluster/howly","RoleArn":"arn:aws:iam::1:role/howly-eventbridge-scheduler","EcsParameters":{"TaskDefinitionArn":"arn:aws:ecs:eu-central-1:1:task-definition/howly-scheduler:1"}},"State":"ENABLED","ScheduleExpressionTimezone":"Europe/Berlin"}'
  exit 0
fi
if [[ "$joined" == *update-schedule* ]]; then
  exit 0
fi
if [[ "$joined" == *list-tasks* ]]; then
  if [ "$TEST_MODE" = "tasks-stay-running" ]; then
    printf '%s\n' "arn:aws:ecs:eu-central-1:1:task/howly/abc"
  fi
  exit 0
fi
if [[ "$joined" == *stop-task* ]]; then
  exit 0
fi
if [[ "$joined" == *describe-tasks* ]]; then
  printf '%s\n' RUNNING
  exit 0
fi
if [[ "$joined" == *describe-services* ]]; then
  if [ "$TEST_MODE" = "clean" ]; then
    printf '0\t0\t0\n'
  else
    printf '1\t0\t0\n'
  fi
  exit 0
fi
if [[ "$joined" == *update-service* ]]; then
  exit 0
fi
printf 'unexpected aws %s\n' "$joined" >&2
exit 1
EOF
chmod +x "$tmpdir/aws"

export PATH="$tmpdir:$PATH"
export RESTORE_STANDBY_SOURCE_ONLY=1
export FRANKFURT_REGION=eu-central-1
export ECS_CLUSTER=howly
export ECS_SERVICE=howly-api
export FRANKFURT_DESIRED=2
export DAILY_SCHEDULE=howly-streak-daily
export REMINDER_SCHEDULE=howly-streak-reminders
export SCHEDULER_FAMILY=howly-scheduler
export FENCE_ATTEMPTS=3
export FENCE_SLEEP_SECONDS=0
export TEST_MODE=api-timeout
export AWS_MOCK_LOG="$tmpdir/aws.log"
: > "$AWS_MOCK_LOG"

# shellcheck disable=SC1091
source "$root/restore-standby.sh"

reset_flags() {
  api_scaled=0
  fenced=0
  schedules_disabled=0
  seen_tasks=""
  : > "$AWS_MOCK_LOG"
}

reset_flags
TEST_MODE=api-timeout
if fence_frankfurt; then
  echo "expected the API wait to time out" >&2
  exit 1
fi
if [ "$api_scaled" != 1 ] || [ "$fenced" != 0 ]; then
  echo "a timed-out scale-down must be recorded before Frankfurt is called fenced" >&2
  exit 1
fi
unfence
if ! grep -q -- '--desired-count 0' "$AWS_MOCK_LOG"; then
  echo "scale-down was not requested" >&2
  exit 1
fi
if ! grep -q -- '--desired-count 2' "$AWS_MOCK_LOG"; then
  echo "timeout did not restore the Frankfurt API count" >&2
  exit 1
fi

reset_flags
TEST_MODE=tasks-stay-running
if fence_frankfurt; then
  echo "expected running scheduler tasks to block the fence" >&2
  exit 1
fi
if [ "$fenced" != 0 ] || [ "$api_scaled" != 0 ]; then
  echo "the API was scaled before scheduler tasks stopped" >&2
  exit 1
fi
if ! grep -q stop-task "$AWS_MOCK_LOG"; then
  echo "running scheduler tasks were not stopped" >&2
  exit 1
fi
if grep -q update-service "$AWS_MOCK_LOG"; then
  echo "API scale-down ran while a scheduler task was still running" >&2
  exit 1
fi

reset_flags
TEST_MODE=clean
fence_frankfurt
if [ "$fenced" != 1 ] || [ "$api_scaled" != 1 ]; then
  echo "a finished scale-down should be fenced" >&2
  exit 1
fi
if ! grep -q stop-task "$AWS_MOCK_LOG" && grep -q list-tasks "$AWS_MOCK_LOG"; then
  :
else
  if grep -q stop-task "$AWS_MOCK_LOG"; then
    echo "clean fence stopped a task that was not running" >&2
    exit 1
  fi
fi

echo "fence checks passed"
