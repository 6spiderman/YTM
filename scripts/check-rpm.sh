#!/usr/bin/env bash
# Static checks for the built .rpm. Usage: scripts/check-rpm.sh dist-installer-linux/ytm-<ver>.x86_64.rpm
# Needs the rpm CLI (Debian/Ubuntu: apt install rpm; also provides rpm2cpio) and desktop-file-validate.
set -u
RPM=${1:?usage: check-rpm.sh <file.rpm>}
FAIL=0
ok() { echo "PASS  $1"; }
bad() { echo "FAIL  $1"; FAIL=1; }
has() { grep -qE -- "$2" <<<"$1"; }

INFO=$(rpm -qpi "$RPM" 2>/dev/null)
REQ=$(rpm -qpR "$RPM" 2>/dev/null)
LIST=$(rpm -qpl "$RPM" 2>/dev/null)
SCRIPTS=$(rpm -qp --scripts "$RPM" 2>/dev/null)
TMP=$(mktemp -d)
(cd "$TMP" && rpm2cpio "$OLDPWD/$RPM" | cpio -idm --quiet 2>/dev/null)

has "$INFO" '^Name *: ytm$' && ok "package name is ytm" || bad "package name"
has "$INFO" '^Architecture *: x86_64$' && ok "architecture x86_64" || bad "architecture"
has "$REQ" 'nss' && ok "requires nss" || bad "nss requirement missing"
has "$REQ" 'alsa-lib|libasound2' && ok "requires alsa" || bad "alsa requirement missing"
has "$REQ" 'libsecret' && ok "requires libsecret" || bad "libsecret requirement missing"
if has "$REQ" '^systemd'; then bad "must not require systemd"; else ok "no systemd requirement"; fi
has "$LIST" '^/opt/YTM/ytm$' && ok "main binary at /opt/YTM/ytm" || bad "main binary missing"
has "$LIST" '^/opt/YTM/chrome-sandbox$' && ok "chrome-sandbox shipped" || bad "chrome-sandbox missing"
has "$LIST" '^/opt/YTM/resources/apparmor-profile$' && ok "AppArmor profile shipped" || bad "AppArmor profile missing"
for s in 16 24 32 48 64 128 256; do
  has "$LIST" "hicolor/${s}x${s}/apps/ytm\.png$" || bad "icon ${s}x${s} missing"
done
has "$LIST" 'hicolor/256x256/apps/ytm\.png$' && ok "hicolor icons present"
DESK="$TMP/usr/share/applications/ytm.desktop"
if [ -f "$DESK" ]; then
  desktop-file-validate "$DESK" && ok "ytm.desktop validates" || bad "ytm.desktop invalid"
  grep -q '^Exec=/opt/YTM/ytm --ozone-platform=x11' "$DESK" && ok "Exec starts in X11 mode" || bad "Exec line wrong"
  grep -q '^StartupWMClass=ytm$' "$DESK" && ok "StartupWMClass=ytm" || bad "StartupWMClass wrong"
  grep -q '^Categories=AudioVideo;Audio;Player;$' "$DESK" && ok "Categories set" || bad "Categories wrong"
else
  bad "ytm.desktop missing"
fi
grep -q 'chrome-sandbox' <<<"$SCRIPTS" && ok "post-install sets chrome-sandbox mode" || bad "post-install lacks chrome-sandbox handling"
grep -q 'update-desktop-database' <<<"$SCRIPTS" && ok "post-install refreshes the desktop database" || bad "post-install lacks update-desktop-database"
if grep -q -- '--no-sandbox' "$DESK" <<<"$SCRIPTS" 2>/dev/null; then bad "--no-sandbox found in scripts or desktop file"; else ok "no --no-sandbox in desktop file or scripts"; fi
rm -rf "$TMP"
[ "$FAIL" -eq 0 ] && echo "RPM CHECKS PASSED" || echo "RPM CHECKS FAILED"
exit "$FAIL"
