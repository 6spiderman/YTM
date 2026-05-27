<div align="center">

<img src="assets/icons/icon.png" width="120" alt="YTM Logo" />

# YTM

**YouTube Music as a proper Windows desktop app**

[![Release](https://img.shields.io/github/v/release/6spiderman/ytm?style=flat-square&color=ff4e45)](https://github.com/6spiderman/ytm/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square&logo=windows)](https://github.com/6spiderman/ytm/releases/latest)
[![License](https://img.shields.io/github/license/6spiderman/ytm?style=flat-square)](LICENSE)

[⬇️ Download Installer](#-installation) · [✨ Features](#-features) · [⌨️ Shortcuts](#%EF%B8%8F-keyboard-shortcuts) · [🔨 Build from Source](#-build-from-source)

</div>

---

## 🎵 What is YTM?

YTM wraps [YouTube Music](https://music.youtube.com) in a clean, native-feeling Windows desktop app. Your Google account stays logged in between sessions, global keyboard shortcuts work even when the window is minimised, and a compact mini-player sits in the corner of your screen when you don't need the full view.

No browser tabs. No losing your music when you close the wrong window. Just YouTube Music, on your desktop.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🎹 **Global shortcuts** | Control playback from anywhere - even when the app is hidden |
| 🗂️ **System tray** | Lives quietly in your tray, shows now-playing in the tooltip and context menu |
| 🪟 **Mini player** | Compact 320x90 overlay that floats above other windows |
| 🔔 **Track notifications** | Windows toast notification on every track change, with album art |
| ⚙️ **Settings UI** | All preferences in one place - no config files to edit |
| 🔒 **Session persistence** | Sign in once, stay signed in forever |
| 🚀 **Start with Windows** | Optional auto-start on login |

---

## 📸 Screenshots

<div align="center">

### Main Window
> Full YouTube Music experience inside a sleek frameless window with a custom title bar.

### Mini Player
> A tiny 320x90 player that sits above your other windows - track info, album art, and playback controls at a glance.

### Settings
> Configure shortcuts, notifications, and general behaviour all in one place.

</div>

---

## ⬇️ Installation

### Option 1 - Installer (recommended)

1. Go to the [**Releases**](https://github.com/6spiderman/ytm/releases/latest) page
2. Download **`YTM Setup 1.0.0.exe`**
3. Run the installer - choose your install directory
4. A desktop shortcut and Start Menu entry will be created automatically
5. Launch **YTM** and sign in to your Google account

> **Note:** Windows may show a SmartScreen warning on first launch because the app is unsigned. Click **"More info" → "Run anyway"** to proceed.

### Option 2 - Build from source

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

Click the **▶ Mini** button in the title bar (or press your Toggle Mini Player shortcut) to switch to the compact overlay.

The mini player shows:
- Album art thumbnail
- Track title and artist
- Previous / Play-Pause / Next buttons
- An expand button to return to the full window

It remembers its screen position between sessions.

---

## 🔨 Build from Source

### Prerequisites

- [Node.js](https://nodejs.org) 18 or later
- [Git](https://git-scm.com)
- Windows 10 or 11

### Steps

```bash
# Clone the repo
git clone https://github.com/6spiderman/ytm.git
cd ytm

# Install dependencies
npm install

# Start in development mode (hot-reloads on file changes)
npm run dev
```

### Build the installer

```bash
npm run build
```

This produces `dist-installer/YTM Setup 1.0.0.exe`.

> **Tip:** You need `assets/icons/icon.ico` and `assets/icons/tray-icon.ico` present before building. They are included in the repo.

### Run tests

```bash
npm test
```

### Project structure

```
src/
  main/           # Electron main process
  preload/        # Context bridge scripts (one per window)
  renderer/       # UI for each window (HTML + TypeScript)
  types.ts        # Shared TypeScript interfaces
scripts/
  bundle-renderer.js   # esbuild bundler for renderer scripts
assets/
  icons/          # App icon in PNG and ICO formats
tests/            # Jest unit tests
```

---

## 🛠️ Tech Stack

- **[Electron 30](https://electronjs.org)** - Desktop shell
- **[TypeScript 5](https://typescriptlang.org)** - Type-safe source
- **[electron-store](https://github.com/sindresorhus/electron-store)** - Settings persistence
- **[esbuild](https://esbuild.github.io)** - Renderer script bundler
- **[electron-builder](https://electron.build)** - NSIS installer packaging

---

## 🐛 Known Issues

- **DOM selectors may break** after a YouTube Music UI update. If playback controls stop working, open an issue - it usually just needs a selector update in `src/main/playerBridge.ts`.
- **SmartScreen warning on install** - the app is currently unsigned. This is expected for self-built releases.
- **Global shortcut conflicts** - if a shortcut fails to register, another app already owns it. Change it in Settings.

---

## 📄 License

MIT - see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ❤️ for people who just want their music in a proper window.

⭐ Star the repo if you find it useful!

</div>
