#!/usr/bin/env bash
# Headless-capable smoke test for the packaged Linux app.
# Usage: scripts/smoke-linux.sh <path-to-ytm-binary> [seconds-to-wait]
# Under CI run it as: xvfb-run -a scripts/smoke-linux.sh /usr/bin/ytm
# Checks: process alive, YTM window present, browser process not started with --no-sandbox, at least one
# renderer running with seccomp (the sandboxed YouTube Music view), clean exit on SIGTERM, no sandbox
# errors in the log. Local windows (main, mini, settings) intentionally run unsandboxed
# (`sandbox: false` in windowManager.ts), so a --no-sandbox renderer is expected and is not a failure.
set -u
BIN=${1:?usage: smoke-linux.sh <ytm-binary> [seconds]}
WAIT=${2:-30}
UD=$(mktemp -d)
FAIL=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAIL=1; }

"$BIN" --ozone-platform=x11 --user-data-dir="$UD" >"$UD/app.log" 2>&1 &
PID=$!
sleep "$WAIT"

procs() { pgrep -f -- "--user-data-dir=$UD" || true; }

kill -0 "$PID" 2>/dev/null && pass "process alive after ${WAIT}s" || fail "process died"

if command -v xwininfo >/dev/null; then
  xwininfo -root -tree 2>/dev/null | grep -q '"YTM"' && pass "YTM window present" || fail "no YTM window"
else
  echo "SKIP  window check (xwininfo missing)"
fi

if tr '\0' ' ' < "/proc/$PID/cmdline" | grep -q -- '--no-sandbox'; then
  fail "browser process started with --no-sandbox"
else
  pass "browser process has the sandbox enabled"
fi

SANDBOXED=0
for p in $(procs); do
  cmd=$(tr '\0' ' ' < "/proc/$p/cmdline" 2>/dev/null) || continue
  case "$cmd" in
    *--type=renderer*) ;;
    *) continue ;;
  esac
  case "$cmd" in *--no-sandbox*) continue ;; esac
  [ "$(awk '/^Seccomp:/{print $2}' "/proc/$p/status" 2>/dev/null)" = "2" ] && SANDBOXED=$((SANDBOXED + 1))
done
[ "$SANDBOXED" -ge 1 ] && pass "$SANDBOXED sandboxed renderer(s) with seccomp active" || fail "no sandboxed renderer found"

if grep -qE 'FATAL:|SUID sandbox helper|No usable sandbox|Failed to move to new namespace' "$UD/app.log"; then
  fail "sandbox/fatal errors in log:"; grep -E 'FATAL:|SUID sandbox helper|No usable sandbox|Failed to move to new namespace' "$UD/app.log" | head -5
else
  pass "no sandbox or fatal errors in log"
fi

kill -TERM "$PID" 2>/dev/null
for _ in $(seq 1 15); do
  [ -z "$(procs)" ] && break
  sleep 1
done
if [ -z "$(procs)" ]; then pass "exited cleanly on SIGTERM"; else fail "processes still running after SIGTERM"; for p in $(procs); do kill -KILL "$p" 2>/dev/null; done; fi

rm -rf "$UD"
[ "$FAIL" -eq 0 ] && echo "SMOKE TEST PASSED" || echo "SMOKE TEST FAILED"
exit "$FAIL"
