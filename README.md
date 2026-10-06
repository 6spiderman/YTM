<div align="center">

<img src="assets/icons/icon.png" width="120" alt="YTM Logo" />

# YTM

**YouTube Music as a proper desktop app for Windows and Linux**

[![Release](https://img.shields.io/github/v/release/6spiderman/ytm?style=flat-square&color=ff4e45)](https://github.com/6spiderman/ytm/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue?style=flat-square)](https://github.com/6spiderman/ytm/releases/latest)
[![License](https://img.shields.io/github/license/6spiderman/ytm?style=flat-square)](LICENSE)

[⬇️ Download Installer](#-installation) · [✨ Features](#-features) · [⌨️ Shortcuts](#%EF%B8%8F-keyboard-shortcuts) · [🔨 Build from Source](#-build-from-source)

</div>

---

## 🎵 What is YTM?

YTM wraps [YouTube Music](https://music.youtube.com) in a clean, native-feeling desktop app for Windows 10/11 and Linux (deb, rpm, pacman and AppImage packages). Your Google account stays logged in between sessions, global keyboard shortcuts work even when the window is minimised, and a compact mini-player sits in the corner of your screen when you don't need the full view.

No browser tabs. No losing your music when you close the wrong window. Just YouTube Music, on your desktop.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🎹 **Global shortcuts** | Control playback from anywhere - even when the app is hidden |
| 🗂️ **System tray** | Lives quietly in your tray, shows now-playing in the tooltip and context menu |
| 🪟 **Mini player** | Compact 360x130 overlay with progress bar, volume slider, shuffle, and repeat |
| 🔔 **Track notifications** | Notification on every track change, with album art and Previous / Play-Pause / Next buttons (Windows toast, freedesktop notification with action buttons on Linux) |
| 🖱️ **Taskbar and media controls** | Windows: hover the taskbar icon to get Previous / Play-Pause / Next buttons without opening the window. Linux: the same controls through MPRIS (media keys, the KDE or GNOME media widget, headset buttons) |
| ⚙️ **Settings UI** | All preferences in one place - no config files to edit |
| 🔒 **Session persistence** | Sign in once, stay signed in forever |
| 🚀 **Start with Windows / at login** | Optional auto-start on login (Windows login item, XDG autostart on Linux) |

---

## ⬇️ Installation

### Windows - installer (recommended)

1. Go to the [**Releases**](https://github.com/6spiderman/ytm/releases/latest) page
2. Download **`YTM Setup 1.2.0.exe`** (GitHub may display the name as `YTM.Setup.1.2.0.exe`)
3. Run the installer - choose your install directory
4. A desktop shortcut and Start Menu entry will be created automatically
5. Launch **YTM** and sign in to your Google account

> **Note:** Windows may show a SmartScreen warning on first launch because the app is unsigned. Click **"More info" → "Run anyway"** to proceed.

### Linux

Pick the package for your distribution from the [**Releases**](https://github.com/6spiderman/ytm/releases/latest) page. All packages are x86_64.

| Distribution family | Package | Status |
|---|---|---|
| Kubuntu 26.04 | `ytm_1.2.0_amd64.deb` | Maintainer-tested |
| Ubuntu 24.04+, Debian 12/13, Linux Mint, Pop!_OS, Zorin | `ytm_1.2.0_amd64.deb` | CI-tested (Debian 12, 13, Ubuntu 24.04); desktop checks by community testers |
| Fedora, RHEL / Rocky / Alma | `ytm-1.2.0.x86_64.rpm` | CI-tested (Fedora); desktop checks by community testers |
| openSUSE | `ytm-1.2.0.x86_64.rpm` | Expected to work (rich dependencies); not yet tested |
| Arch, Manjaro, EndeavourOS, CachyOS | `ytm-1.2.0-1-x86_64.pkg.tar.zst` | CI-tested (Arch); desktop checks by community testers |
| Everything else | `YTM-1.2.0-x86_64.AppImage` | Needs unprivileged user namespaces (see below) |

Want to help? Run [`docs/linux/tester-checklist.md`](docs/linux/tester-checklist.md) on your distribution and open a *Linux test report* issue.

#### Debian / Ubuntu family (`.deb`)

```bash
sudo apt install ./ytm_1.2.0_amd64.deb     # also pulls in the required libraries
```

Upgrade by installing the newer `.deb` the same way. Remove with `sudo apt remove ytm`. The package installs an AppArmor profile so the Chromium sandbox keeps working on Ubuntu 24.04 and newer.

#### Fedora / RHEL / openSUSE (`.rpm`)

```bash
sudo dnf install ./ytm-1.2.0.x86_64.rpm                          # Fedora, RHEL family
sudo zypper install --allow-unsigned-rpm ./ytm-1.2.0.x86_64.rpm  # openSUSE
```

Upgrade by installing the newer `.rpm`. Remove with `sudo dnf remove ytm` (or `sudo zypper remove ytm`).

#### Arch family (`.pkg.tar.zst`)

```bash
sudo pacman -U ytm-1.2.0-1-x86_64.pkg.tar.zst
```

Upgrade with the same command on the newer file. Remove with `sudo pacman -R ytm`.

#### AppImage

```bash
chmod +x YTM-1.2.0-x86_64.AppImage
./YTM-1.2.0-x86_64.AppImage
```

No installation and no root. Upgrade by replacing the file (if you enabled *Start at login*, turn it off and on again so the entry points at the new file). The AppImage uses a static runtime, so it does not need `libfuse2`.

The AppImage cannot carry a privileged sandbox helper, so it needs **unprivileged user namespaces**. That is the default on Fedora, Arch, Debian and Mint. On **Ubuntu 24.04 and newer** (including Kubuntu) the kernel setting `kernel.apparmor_restrict_unprivileged_userns=1` blocks it; YTM then stops with a message instead of running YouTube Music without the Chromium sandbox. Use the `.deb` there. If you accept running unsandboxed, start it with `YTM_ALLOW_NO_SANDBOX=1 ./YTM-1.2.0-x86_64.AppImage`.

#### Where your data lives

Settings and the signed-in session are in `~/.config/ytm` and survive upgrades and removal; delete that folder to reset. *Start at login* writes `~/.config/autostart/ytm.desktop`; it is ignored once the app is gone.

#### Linux notes

- **Display mode:** menu launches run through XWayland (`--ozone-platform=x11`) so the mini player's always-on-top and remembered position work. A start without that flag inside a Wayland session (AppImage from a terminal, `/opt/YTM/ytm`) relaunches itself in X11 mode and prints one `[display]` line (with the AppImage, the first launcher process stays idle in the background until you quit). Native Wayland is possible with `--ozone-platform=wayland` but always-on-top and window positions are not available there.
- **Tray icon:** uses the StatusNotifier protocol. KDE, XFCE, Cinnamon, MATE and LXQt show it out of the box; GNOME needs the *AppIndicator and KStatusNotifierItem Support* extension.
- **Notification buttons** talk to `org.freedesktop.Notifications` through `busctl` (systemd) or, where that is absent, `gdbus` (GLib, package `libglib2.0-bin` / `glib2`). Servers without action support get a plain notification.
- **Media controls:** the standard MPRIS interface that Electron provides; media keys, headset buttons, the KDE media widget and GNOME's quick settings all work.
- **Global shortcuts** use X11 key grabs. If one does not fire, bind the same action in your desktop's shortcut settings to the command `ytm ytm://action/playPause` (also `nextTrack`, `previousTrack`, `volumeUp`, `volumeDown`, `likeTrack`, `dislikeTrack`; with the AppImage use `/path/to/YTM-1.2.0-x86_64.AppImage ytm://action/playPause`).
- **Sign-in storage:** the session cookie key is kept in KWallet (KDE) or GNOME Keyring / libsecret. Without a keyring Chromium falls back to an obfuscated file, so a keyring is recommended.

### Build from source

See [🔨 Build from Source](#-build-from-source) below.

---

## ⌨️ Keyboard Shortcuts

Shortcuts are **not set by default** - you configure your own so there are no conflicts with other apps.

Open **Settings** (⚙ in the title bar or tray menu) and set whichever ones you want:

| Action | Description |
|--------|-------------|
| ▶️ Play / Pause | Toggle playback |
| ⏭️ Next Track | Skip to the next song |
| ⏮️ Previous Track | Go back to the previous song |
| 🔊 Volume Up | Increase volume by one step |
| 🔉 Volume Down | Decrease volume by one step |
| 👍 Like Track | Like the current song |
| 👎 Dislike Track | Dislike the current song |
| 👁️ Show / Hide Window | Bring the main window to focus or hide it |
| 🪟 Toggle Mini Player | Switch between the full window and the mini player |

**Suggested shortcuts** if you want a quick starting point:

| Action | Shortcut |
|--------|----------|
| Play / Pause | `Ctrl + Alt + Space` |
| Next Track | `Ctrl + Alt + Right` |
| Previous Track | `Ctrl + Alt + Left` |
| Volume Up | `Ctrl + Alt + Up` |
| Volume Down | `Ctrl + Alt + Down` |
| Show / Hide Window | `Ctrl + Alt + M` |
| Toggle Mini Player | `Ctrl + Alt + P` |

> Shortcuts are global - they work even when YTM is minimised or in the background.

---

## ⚙️ Settings

Access settings from the **⚙ gear button** in the title bar, or right-click the tray icon and choose **Settings**.

### General

| Setting | Description |
|---------|-------------|
| Start with Windows | Launch YTM automatically when you log in |
| Start minimised to tray | Start in the background without showing the window |
| Minimise to tray | Closing the window hides the app to tray instead of quitting |
| Mini-player always on top | Keep the mini player floating above all other windows |
| Volume step | How much each volume shortcut adjusts the level (default: 5%) |

### Notifications

| Setting | Description |
|---------|-------------|
| Enable notifications | Show a Windows toast when the track changes |
| Title template | What appears as the notification title - use `{artist}` and `{title}` |
| Body template | What appears as the notification body |
| Show album art | Display the album artwork in the notification |
| Play notification sound | Play the Windows notification sound |
| Action buttons | Previous, Play/Pause, and Next buttons appear directly in the notification (installed app only) |

**Template tokens:**

- `{artist}` - replaced with the artist name
- `{title}` - replaced with the track title

Example: title `{artist}` + body `{title}` gives you:

```
Daft Punk
Get Lucky
```

---

## 🪟 Mini Player

Click the **▶ Mini** button in the title bar (or press your Toggle Mini Player shortcut) to switch to the compact 360x130 overlay.

The mini player shows:
- Album art thumbnail
- Track title and artist
- Shuffle, Previous, Play-Pause, Next, and Repeat buttons (YTM-style SVG icons)
- Like / Dislike buttons
- Track progress bar with current and total time (click to seek)
- Vertical volume slider
- An expand button to return to the full window

It remembers its screen position between sessions.

---

## 🖱️ Taskbar Controls

Hovering over the YTM taskbar icon shows **Previous / Play-Pause / Next** media control buttons directly in the Windows thumbnail toolbar. No window preview is shown - just the buttons.

Clicking the taskbar icon minimizes and restores the window the same way any Windows app does. Both full player and mini player modes work the same way.

---

## 🔨 Build from Source

### Prerequisites

- [Node.js](https://nodejs.org) 22 or later (Electron 44 bundles Node 24; CI uses Node 22)
- [Git](https://git-scm.com)
- Windows 10 or 11, or a Linux distribution with Node.js 22+ (Kubuntu 26.04 is the maintainer's machine)

### Steps

```bash
# Clone the repo
git clone https://github.com/6spiderman/YTM.git
cd YTM

# Install dependencies
npm install

# Start in development mode
npm run dev
```

### Build the installer

```bash
npm run build
```

This produces `dist-installer/YTM Setup 1.2.0.exe` (Windows only).

> **Tip:** You need `assets/icons/icon.ico` and `assets/icons/tray-icon.ico` present before building. They are included in the repo.

### Build on Linux

Work in a clone on a Linux filesystem (not a shared NTFS partition, where `node_modules` would hold Windows binaries).

```bash
sudo apt install nodejs npm rpm libarchive-tools zstd desktop-file-utils xvfb   # Debian/Ubuntu names
npm ci
npm run dev:linux                 # development, runs through XWayland
npm run build:linux               # dist-installer-linux/: .deb, .rpm, .pkg.tar.zst and .AppImage
npm run build:linux:deb           # only the .deb (faster)
scripts/check-deb.sh      dist-installer-linux/ytm_1.2.0_amd64.deb
scripts/check-rpm.sh      dist-installer-linux/ytm-1.2.0.x86_64.rpm
scripts/check-pacman.sh   dist-installer-linux/ytm-1.2.0-1-x86_64.pkg.tar.zst
scripts/check-appimage.sh dist-installer-linux/YTM-1.2.0-x86_64.AppImage
```

`rpm` provides `rpmbuild` for the rpm target and `libarchive-tools` provides `bsdtar` for the Arch package; both are built on any distribution. `scripts/smoke-linux.sh <path-to-ytm-or-AppImage>` starts the app against a throwaway profile and checks the sandbox, the window and a clean SIGTERM exit (use `xvfb-run -a` on a headless machine). `scripts/ci/container-test.sh` is what CI runs inside Debian, Fedora, Arch and openSUSE containers.

### Project structure

```
src/
  main/           # Electron main process
  preload/        # Context bridge scripts (one per window)
  renderer/       # UI for each window (HTML + TypeScript)
    main-window/  # Full player title bar
    mini-player/  # Compact 360x130 overlay
    settings/     # Settings window
  types.ts        # Shared TypeScript interfaces
scripts/
  bundle-renderer.js   # esbuild bundler for renderer scripts
assets/
  icons/          # App icon, tray icon, and thumbar button images
```

---

## 🛠️ Tech Stack

- **[Electron 44](https://electronjs.org)** - Desktop shell
- **[TypeScript 5](https://typescriptlang.org)** - Type-safe source
- **[electron-store](https://github.com/sindresorhus/electron-store)** - Settings persistence
- **[esbuild](https://esbuild.github.io)** - Renderer script bundler
- **[electron-builder](https://electron.build)** - NSIS installer and deb / rpm / pacman / AppImage packaging

---

## 🐛 Known Issues

- **DOM selectors may break** after a YouTube Music UI update. If playback controls stop working, open an issue - it usually just needs a selector update in `src/main/playerBridge.ts`.
- **SmartScreen warning on install** - the app is currently unsigned. This is expected for self-built releases.
- **Linux: native Wayland** - always-on-top, window positions and global shortcuts are not available through Wayland in the same way; use the default XWayland mode.
- **Linux: notification sound** - the "Play notification sound" setting only suppresses or allows the sound; which sound plays is controlled by your desktop's notification settings.
- **Linux: AppImage on Ubuntu 24.04+** - stops at start because the kernel blocks the unprivileged sandbox; install the `.deb` instead (details under Installation).
- **Linux: GNOME tray** - GNOME Shell shows no tray icons without the AppIndicator extension; the window and media controls still work.
- **Global shortcut conflicts** - if a shortcut fails to register, another app already owns it. Change it in Settings.

---

## 📄 License

MIT - see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ❤️ for people who just want their music in a proper window.

⭐ Star the repo if you find it useful!

</div>
