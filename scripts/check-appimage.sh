#!/usr/bin/env bash
# Static checks for the built AppImage. Usage: scripts/check-appimage.sh dist-installer-linux/YTM-<ver>-x86_64.AppImage
# Extracts the image (works without FUSE) and checks the launcher, desktop entry and sandbox setup.
set -u
IMG=${1:?usage: check-appimage.sh <file.AppImage>}
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo unknown)
FAIL=0
ok() { echo "PASS  $1"; }
bad() { echo "FAIL  $1"; FAIL=1; }

chmod +x "$IMG"
TMP=$(mktemp -d)
ABS=$(readlink -f "$IMG")
(cd "$TMP" && "$ABS" --appimage-extract >/dev/null 2>&1) && ok "image extracts" || bad "image does not extract"
ROOT="$TMP/squashfs-root"

if head -c 1048576 "$ABS" | strings | grep -q 'libfuse.so.2'; then
  bad "runtime links libfuse2 (legacy toolset); use the static runtime"
else
  ok "static runtime (no libfuse2 dependency)"
fi
[ -x "$ROOT/AppRun" ] && ok "AppRun present" || bad "AppRun missing"
[ -x "$ROOT/ytm" ] && ok "ytm binary present" || bad "ytm binary missing"
[ -f "$ROOT/chrome-sandbox" ] && ok "chrome-sandbox shipped" || bad "chrome-sandbox missing"
[ -f "$ROOT/resources/app.asar" ] && ok "app.asar present" || bad "app.asar missing"
DESK=$(ls "$ROOT"/*.desktop 2>/dev/null | head -1)
if [ -n "$DESK" ] && [ -f "$DESK" ]; then
  desktop-file-validate "$DESK" && ok "desktop entry validates" || bad "desktop entry invalid"
  grep -q '^Exec=AppRun --ozone-platform=x11' "$DESK" && ok "Exec starts in X11 mode" || bad "Exec line wrong"
  grep -q "^X-AppImage-Version=$VERSION\$" "$DESK" && ok "X-AppImage-Version=$VERSION" || bad "X-AppImage-Version is not $VERSION"
  grep -q '^Icon=ytm$' "$DESK" && ok "Icon=ytm" || bad "Icon wrong"
  grep -q '^Categories=AudioVideo;Audio;Player;$' "$DESK" && ok "Categories set" || bad "Categories wrong"
else
  bad "desktop entry missing"
fi
[ -f "$ROOT/ytm.png" ] || [ -L "$ROOT/ytm.png" ] && ok "top-level icon present" || bad "top-level icon missing"
# electron-builder's AppRun appends --no-sandbox only when unprivileged user namespaces are unusable;
# the desktop entry and our own code must never carry it.
if grep -q -- '--no-sandbox' "$DESK" 2>/dev/null; then bad "--no-sandbox in desktop entry"; else ok "no --no-sandbox in desktop entry"; fi
rm -rf "$TMP"
[ "$FAIL" -eq 0 ] && echo "APPIMAGE CHECKS PASSED" || echo "APPIMAGE CHECKS FAILED"
exit "$FAIL"
