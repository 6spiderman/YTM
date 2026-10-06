#!/usr/bin/env bash
# Installs a built package inside a distro container, checks the installed files, runs the headless
# smoke test as an unprivileged user and removes the package again.
# Usage (run as root inside the container, repository mounted at /work):
#   bash scripts/ci/container-test.sh <deb|rpm|pacman> <package-file>
# Distro tooling is detected from the package manager that exists in the image.
set -u
FORMAT=${1:?usage: container-test.sh <deb|rpm|pacman> <package-file>}
PKG=${2:?usage: container-test.sh <deb|rpm|pacman> <package-file>}
WAIT=${SMOKE_WAIT:-40}
FAIL=0
ok() { echo "PASS  $1"; }
bad() { echo "FAIL  $1"; FAIL=1; }
step() { echo; echo "### $1"; }

[ -f "$PKG" ] || { echo "package file not found: $PKG"; exit 2; }
PKG=$(readlink -f "$PKG")

step "install tools and the package ($FORMAT)"
if command -v apt-get >/dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq xvfb x11-utils procps util-linux >/dev/null
  apt-get install -y -qq "$PKG" && ok "apt installed the package" || bad "apt install failed"
  REMOVE="apt-get remove -y -qq ytm"
elif command -v dnf >/dev/null; then
  dnf install -y -q xorg-x11-server-Xvfb xorg-x11-utils procps-ng util-linux >/dev/null   # util-linux (not -core) has runuser
  dnf install -y -q "$PKG" && ok "dnf installed the package" || bad "dnf install failed"
  REMOVE="dnf remove -y -q ytm"
elif command -v zypper >/dev/null; then
  zypper --non-interactive --quiet install xorg-x11-server-Xvfb xvfb-run xwininfo procps util-linux >/dev/null
  zypper --non-interactive --quiet install --allow-unsigned-rpm "$PKG" && ok "zypper installed the package" || bad "zypper install failed"
  REMOVE="zypper --non-interactive remove ytm"
elif command -v pacman >/dev/null; then
  pacman -Syu --noconfirm --quiet xorg-server-xvfb xorg-xwininfo procps-ng util-linux >/dev/null
  pacman -U --noconfirm "$PKG" && ok "pacman installed the package" || bad "pacman install failed"
  REMOVE="pacman -R --noconfirm ytm"
else
  echo "no supported package manager in this image"; exit 2
fi

step "installed files"
[ -x /opt/YTM/ytm ] && ok "/opt/YTM/ytm present" || bad "/opt/YTM/ytm missing"
[ -x /usr/bin/ytm ] && ok "/usr/bin/ytm resolves" || bad "/usr/bin/ytm missing"
[ -f /usr/share/applications/ytm.desktop ] && ok "desktop entry installed" || bad "desktop entry missing"
[ -f /usr/share/icons/hicolor/256x256/apps/ytm.png ] && ok "icon installed" || bad "icon missing"
MISSING=$(ldd /opt/YTM/ytm 2>/dev/null | grep 'not found' || true)
if [ -z "$MISSING" ]; then ok "every shared library resolves"; else bad "unresolved libraries:"; echo "$MISSING"; fi
MODE=$(stat -c %a /opt/YTM/chrome-sandbox 2>/dev/null || echo none)
echo "info  chrome-sandbox mode $MODE; unshare -Ur as root: $(unshare -Ur true 2>/dev/null && echo works || echo unavailable)"

step "headless smoke test as an unprivileged user"
id tester >/dev/null 2>&1 || useradd -m tester
chmod +x /work/scripts/smoke-linux.sh
# Chromium needs either unprivileged user namespaces or a setuid chrome-sandbox. The package's
# post-install picks the mode from root's view, so report what the unprivileged user actually gets.
if runuser -u tester -- unshare -Ur true 2>/dev/null; then
  ok "unprivileged user namespaces available to tester"
else
  echo "info  user namespaces unavailable to tester (host restriction); chrome-sandbox mode is $MODE"
fi
if runuser -u tester -- env HOME=/home/tester xvfb-run -a /work/scripts/smoke-linux.sh /usr/bin/ytm "$WAIT"; then
  ok "smoke test passed"
else
  bad "smoke test failed"
fi

step "remove the package"
$REMOVE >/dev/null && ok "package removed" || bad "removal failed"
if [ ! -e /opt/YTM ]; then
  ok "/opt/YTM gone"
elif [ -z "$(find /opt/YTM -type f 2>/dev/null)" ]; then
  echo "info  only empty directories left under /opt/YTM (rpm does not own the directories):"; find /opt/YTM | head -5
  ok "no files left under /opt/YTM"
else
  bad "files left behind under /opt/YTM:"; find /opt/YTM -type f | head -10
fi
[ ! -e /usr/bin/ytm ] && ok "/usr/bin/ytm gone" || bad "/usr/bin/ytm left behind"

echo
[ "$FAIL" -eq 0 ] && echo "CONTAINER TEST PASSED" || echo "CONTAINER TEST FAILED"
exit "$FAIL"
