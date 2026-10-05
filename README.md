<div align="center">

<img src="assets/icons/icon.png" width="120" alt="YTM Logo" />

# YTM

**YouTube Music as a proper desktop app for Windows and Kubuntu**

[![Release](https://img.shields.io/github/v/release/6spiderman/ytm?style=flat-square&color=ff4e45)](https://github.com/6spiderman/ytm/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Kubuntu-blue?style=flat-square)](https://github.com/6spiderman/ytm/releases/latest)
[![License](https://img.shields.io/github/license/6spiderman/ytm?style=flat-square)](LICENSE)

[⬇️ Download Installer](#-installation) · [✨ Features](#-features) · [⌨️ Shortcuts](#%EF%B8%8F-keyboard-shortcuts) · [🔨 Build from Source](#-build-from-source)

</div>

---

## 🎵 What is YTM?

YTM wraps [YouTube Music](https://music.youtube.com) in a clean, native-feeling desktop app for Windows 10/11 and Kubuntu 26.04. Your Google account stays logged in between sessions, global keyboard shortcuts work even when the window is minimised, and a compact mini-player sits in the corner of your screen when you don't need the full view.

No browser tabs. No losing your music when you close the wrong window. Just YouTube Music, on your desktop.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🎹 **Global shortcuts** | Control playback from anywhere - even when the app is hidden |
| 🗂️ **System tray** | Lives quietly in your tray, shows now-playing in the tooltip and context menu |
| 🪟 **Mini player** | Compact 360x130 overlay with progress bar, volume slider, shuffle, and repeat |
| 🔔 **Track notifications** | Notification on every track change, with album art and Previous / Play-Pause / Next buttons (Windows toast, KDE notification on Kubuntu) |
| 🖱️ **Taskbar controls** | Windows: hover the taskbar icon to get Previous / Play-Pause / Next buttons without opening the window. Kubuntu: the same controls through KDE media controls (media keys, media widget, task manager) |
| ⚙️ **Settings UI** | All preferences in one place - no config files to edit |
| 🔒 **Session persistence** | Sign in once, stay signed in forever |
| 🚀 **Start with Windows / at login** | Optional auto-start on login (Windows login item, XDG autostart on Kubuntu) |

---

## ⬇️ Installation

### Windows - installer (recommended)

1. Go to the [**Releases**](https://github.com/6spiderman/ytm/releases/latest) page
2. Download **`YTM Setup 1.1.0.exe`** (GitHub may display the name as `YTM.Setup.1.1.0.exe`)
3. Run the installer - choose your install directory
4. A desktop shortcut and Start Menu entry will be created automatically
5. Launch **YTM** and sign in to your Google account

> **Note:** Windows may show a SmartScreen warning on first launch because the app is unsigned. Click **"More info" → "Run anyway"** to proceed.

### Kubuntu 26.04 - `.deb` package

1. Download **`ytm_1.1.0_amd64.deb`** from the [**Releases**](https://github.com/6spiderman/ytm/releases/latest) page
2. Install it (this also pulls in the required libraries):
   ```bash
   sudo apt install ./ytm_1.1.0_amd64.deb
   ```
3. Launch **YTM** from the application menu (or run `ytm`) and sign in to your Google account

To remove it: `sudo apt remove ytm`. Your settings and sign-in live in `~/.config/ytm` and are kept; delete that folder to remove them. If you enabled start at login, also delete `~/.config/autostart/ytm.desktop` (it is ignored once the package is gone).

The package installs an AppArmor profile so the Chromium sandbox keeps working on Ubuntu 24.04 and newer, and it never starts the app with `--no-sandbox`. The app is not signed or published in an APT repository, so update by installing the newer `.deb`.

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
- Windows 10 or 11, or Kubuntu 26.04 (other recent Ubuntu-based systems should work but are not tested)

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

This produces `dist-installer/YTM Setup 1.1.0.exe` (Windows only).

> **Tip:** You need `assets/icons/icon.ico` and `assets/icons/tray-icon.ico` present before building. They are included in the repo.

### Build on Kubuntu

Work in a clone on a Linux filesystem (not a shared NTFS partition, where `node_modules` would hold Windows binaries).

```bash
sudo apt install nodejs npm       # Node 22 from the Ubuntu archive
npm ci
npm run dev:linux                 # development, runs through XWayland
npm run build:linux               # produces dist-installer-linux/ytm_1.1.0_amd64.deb
scripts/check-deb.sh dist-installer-linux/ytm_1.1.0_amd64.deb
```

`scripts/smoke-linux.sh <path-to-ytm>` starts the app against a throwaway profile and checks the sandbox, the window and a clean SIGTERM exit (use `xvfb-run -a` on a headless machine).

### Kubuntu notes

- **Display mode:** the package starts YTM with `--ozone-platform=x11`, so it runs through XWayland even in a Wayland session. This keeps the mini player's always-on-top and remembered position working. Native Wayland is possible by launching with `--ozone-platform=wayland` but is experimental: always-on-top and window positions are not available there.
- **Media controls:** while music plays, KDE shows YTM in its media widget and the media keys, Bluetooth headset buttons and lock screen controls work through the standard MPRIS interface that Electron provides.
- **Global shortcuts:** they use X11 key grabs. If one does not fire under your Plasma settings, bind the same action in *System Settings → Keyboard → Shortcuts* to the command `ytm ytm://action/playPause` (also `nextTrack`, `previousTrack`, `volumeUp`, `volumeDown`, `likeTrack`, `dislikeTrack`).
- **Notifications** use the standard KDE notification service. The buttons need `busctl` (part of systemd, installed by default).
- **Sign-in storage:** your session is encrypted with KWallet 6 (Plasma). The first launch may ask to unlock the wallet.

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
- **[electron-builder](https://electron.build)** - NSIS installer and `.deb` packaging

---

## 🐛 Known Issues

- **DOM selectors may break** after a YouTube Music UI update. If playback controls stop working, open an issue - it usually just needs a selector update in `src/main/playerBridge.ts`.
- **SmartScreen warning on install** - the app is currently unsigned. This is expected for self-built releases.
- **Kubuntu: native Wayland** - always-on-top, window positions and global shortcuts are not available through Wayland in the same way; use the default XWayland mode.
- **Kubuntu: notification sound** - the "Play notification sound" setting only suppresses or allows the sound; which sound plays is controlled by KDE's notification settings.
- **Global shortcut conflicts** - if a shortcut fails to register, another app already owns it. Change it in Settings.

---

## 📄 License

MIT - see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ❤️ for people who just want their music in a proper window.

⭐ Star the repo if you find it useful!

</div>
