#!/usr/bin/env bash
# Static checks for the built .deb. Usage: scripts/check-deb.sh dist-installer-linux/ytm_<ver>_amd64.deb
set -u
DEB=${1:?usage: check-deb.sh <file.deb>}
FAIL=0
ok() { echo "PASS  $1"; }
bad() { echo "FAIL  $1"; FAIL=1; }
has() { grep -qE -- "$2" <<<"$1"; }

CTRL=$(dpkg-deb -I "$DEB")
LIST=$(dpkg-deb -c "$DEB")
TMP=$(mktemp -d)
dpkg-deb -x "$DEB" "$TMP"

has "$CTRL" '^ Package: ytm$' && ok "package name is ytm" || bad "package name"
has "$CTRL" '^ Architecture: amd64$' && ok "architecture amd64" || bad "architecture"
has "$CTRL" '^ Maintainer: .+<.+@.+>' && ok "maintainer set" || bad "maintainer missing"
has "$CTRL" '^ Depends:.*systemd' && ok "depends on systemd (busctl)" || bad "systemd dependency missing"
has "$CTRL" '^ Depends:.*libnss3' && ok "depends on libnss3" || bad "libnss3 dependency missing"
has "$LIST" ' \./opt/YTM/ytm$' && ok "main binary at /opt/YTM/ytm" || bad "main binary missing"
has "$LIST" ' \./opt/YTM/chrome-sandbox$' && ok "chrome-sandbox shipped" || bad "chrome-sandbox missing"
has "$LIST" ' \./opt/YTM/resources/apparmor-profile$' && ok "AppArmor profile shipped" || bad "AppArmor profile missing"
for s in 16 24 32 48 64 128 256; do
  has "$LIST" "hicolor/${s}x${s}/apps/ytm\.png$" || { bad "icon ${s}x${s} missing"; }
done
has "$LIST" 'hicolor/256x256/apps/ytm\.png$' && ok "hicolor icons present"
DESK="$TMP/usr/share/applications/ytm.desktop"
if [ -f "$DESK" ]; then
  desktop-file-validate "$DESK" && ok "ytm.desktop validates" || bad "ytm.desktop invalid"
  grep -q '^Exec=/opt/YTM/ytm --ozone-platform=x11' "$DESK" && ok "Exec starts in X11 mode" || bad "Exec line wrong"
  grep -q '^StartupWMClass=ytm$' "$DESK" && ok "StartupWMClass=ytm" || bad "StartupWMClass wrong"
  grep -q '^Icon=ytm$' "$DESK" && ok "Icon=ytm" || bad "Icon wrong"
else
  bad "ytm.desktop missing"
fi
dpkg-deb -e "$DEB" "$TMP/ctl"
grep -q 'apparmor_parser' "$TMP/ctl/postinst" && ok "postinst installs the AppArmor profile" || bad "postinst lacks AppArmor handling"
grep -q 'chrome-sandbox' "$TMP/ctl/postinst" && ok "postinst sets chrome-sandbox mode" || bad "postinst lacks chrome-sandbox handling"
if grep -q -- '--no-sandbox' "$DESK" "$TMP/ctl/postinst" 2>/dev/null; then bad "--no-sandbox found in package scripts or desktop file"; else ok "no --no-sandbox in desktop file or scripts"; fi
rm -rf "$TMP"
[ "$FAIL" -eq 0 ] && echo "DEB CHECKS PASSED" || echo "DEB CHECKS FAILED"
exit "$FAIL"
