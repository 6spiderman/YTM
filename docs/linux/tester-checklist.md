# YTM 1.2.0 on Linux: tester checklist

Thank you for testing. This takes about 20 minutes. Fill in the environment block, work through the
checks, then report (last section). Every line is Pass / Fail / N-A; a Fail with one sentence of what
you saw is the most useful result.

## 1. Your environment

Run these and paste the output:

```bash
head -2 /etc/os-release
echo "session=$XDG_SESSION_TYPE desktop=$XDG_CURRENT_DESKTOP"
ldd --version | head -1
sysctl kernel.apparmor_restrict_unprivileged_userns 2>/dev/null   # Ubuntu-based only
```

Also note: package format you installed (deb / rpm / pacman / AppImage), monitor count and scaling.

## 2. Install

| Format | Command |
|---|---|
| Debian, Ubuntu, Mint, Pop!_OS | `sudo apt install ./ytm_1.2.0_amd64.deb` |
| Fedora, RHEL family | `sudo dnf install ./ytm-1.2.0.x86_64.rpm` |
| openSUSE | `sudo zypper install --allow-unsigned-rpm ./ytm-1.2.0.x86_64.rpm` |
| Arch, Manjaro, EndeavourOS | `sudo pacman -U ytm-1.2.0-1-x86_64.pkg.tar.zst` |
| Anything else | `chmod +x YTM-1.2.0-x86_64.AppImage && ./YTM-1.2.0-x86_64.AppImage` |

The AppImage needs unprivileged user namespaces. On Ubuntu 24.04 and newer it stops with a message
about the sandbox; that is expected, use the `.deb` there.

## 3. Checks

| # | Check | Expected | Result |
|---|---|---|---|
| 1 | Start YTM from the application menu | Window opens, YouTube Music loads | |
| 2 | Quit, then start from a terminal: `ytm` (AppImage: `./YTM-1.2.0-x86_64.AppImage`) | Same window; in a Wayland session the terminal prints one `[display] … relaunching … in X11 mode` line | |
| 3 | Window icon and taskbar/dock | YTM icon shown; exactly one entry | |
| 4 | Tray icon: left click, right-click menu | Left click shows/hides the window; menu has Show, Settings, Quit (GNOME: needs the AppIndicator extension) | |
| 5 | Sign in to Google, quit, start again | Still signed in | |
| 6 | Play a track, pause, next, previous | Works, audio plays | |
| 7 | Change track with notifications enabled (Settings → Notifications) | Notification with album art and Previous / Play-Pause / Next buttons; all three buttons act | |
| 8 | Keyboard media keys or the desktop's media widget (KDE media widget, GNOME quick settings) | Control playback | |
| 9 | Set two global shortcuts in Settings; press them while another app has focus | Both fire | |
| 10 | Mini player (▶ Mini in the title bar): move it, quit, restart, toggle mini again | Stays above other windows; reopens at the same spot | |
| 11 | Settings → "Start at login" on; log out and in | YTM starts (minimised if that option is on) | |
| 12 | Upgrade (deb/rpm/pacman only): install over an existing 1.1.0 if you had one | Settings and sign-in kept | |
| 13 | Uninstall (`apt remove ytm` / `dnf remove ytm` / `pacman -R ytm`) | No `/opt/YTM`, no `/usr/bin/ytm`; `~/.config/ytm` stays | |
| 14 | Log out or shut down while YTM is running | No "application is not responding" prompt; session ends normally | |

## 4. Logs

If anything failed, run YTM from a terminal and attach the output:

```bash
ytm 2>&1 | tee ~/ytm-report.log        # AppImage: ./YTM-1.2.0-x86_64.AppImage 2>&1 | tee ~/ytm-report.log
```

The line starting with `[display]` and any line containing `sandbox` are the most useful.

## 5. Report

Open a **Linux test report** issue (New issue → Linux test report) in the repository and paste the
environment block, the table and the log. If you have no repository access, send the filled-in file to
the maintainer.
