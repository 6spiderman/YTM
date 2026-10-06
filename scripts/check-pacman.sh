#!/usr/bin/env bash
# Static checks for the built Arch package. Usage: scripts/check-pacman.sh dist-installer-linux/ytm-<ver>-1-x86_64.pkg.tar.zst
# Needs bsdtar (Debian/Ubuntu: apt install libarchive-tools) and desktop-file-validate.
set -u
PKG=${1:?usage: check-pacman.sh <file.pkg.tar.zst>}
FAIL=0
ok() { echo "PASS  $1"; }
bad() { echo "FAIL  $1"; FAIL=1; }
has() { grep -qE -- "$2" <<<"$1"; }

LIST=$(bsdtar -tf "$PKG" 2>/dev/null)
PKGINFO=$(bsdtar -xOf "$PKG" .PKGINFO 2>/dev/null)
INSTALL=$(bsdtar -xOf "$PKG" .INSTALL 2>/dev/null)
TMP=$(mktemp -d)
bsdtar -xf "$PKG" -C "$TMP" usr/share/applications/ytm.desktop 2>/dev/null

has "$PKGINFO" '^pkgname = ytm$' && ok "package name is ytm" || bad "package name"
has "$PKGINFO" '^arch = x86_64$' && ok "architecture x86_64" || bad "architecture"
for dep in gtk3 nss libnotify libxss libxtst xdg-utils at-spi2-core libsecret alsa-lib glib2; do
  has "$PKGINFO" "^depend = $dep\$" || bad "dependency $dep missing"
done
has "$PKGINFO" '^depend = alsa-lib$' && ok "depends on the Arch library set"
if has "$PKGINFO" 'libappindicator-gtk3'; then bad "depends on AUR-only libappindicator-gtk3"; else ok "no AUR-only dependency"; fi
has "$LIST" '^opt/YTM/ytm$' && ok "main binary at /opt/YTM/ytm" || bad "main binary missing"
has "$LIST" '^opt/YTM/chrome-sandbox$' && ok "chrome-sandbox shipped" || bad "chrome-sandbox missing"
for s in 16 24 32 48 64 128 256; do
  has "$LIST" "hicolor/${s}x${s}/apps/ytm\.png$" || bad "icon ${s}x${s} missing"
done
has "$LIST" 'hicolor/256x256/apps/ytm\.png$' && ok "hicolor icons present"
DESK="$TMP/usr/share/applications/ytm.desktop"
if [ -f "$DESK" ]; then
  desktop-file-validate "$DESK" && ok "ytm.desktop validates" || bad "ytm.desktop invalid"
  grep -q '^Exec=/opt/YTM/ytm --ozone-platform=x11' "$DESK" && ok "Exec starts in X11 mode" || bad "Exec line wrong"
  grep -q '^StartupWMClass=ytm$' "$DESK" && ok "StartupWMClass=ytm" || bad "StartupWMClass wrong"
else
  bad "ytm.desktop missing"
fi
grep -q 'post_install' <<<"$INSTALL" && ok ".INSTALL has post_install" || bad ".INSTALL lacks post_install"
grep -q 'chrome-sandbox' <<<"$INSTALL" && ok "post_install sets chrome-sandbox mode" || bad "post_install lacks chrome-sandbox handling"
if grep -q -- '--no-sandbox' "$DESK" <<<"$INSTALL" 2>/dev/null; then bad "--no-sandbox found in scripts or desktop file"; else ok "no --no-sandbox in desktop file or scripts"; fi
rm -rf "$TMP"
[ "$FAIL" -eq 0 ] && echo "PACMAN CHECKS PASSED" || echo "PACMAN CHECKS FAILED"
exit "$FAIL"
