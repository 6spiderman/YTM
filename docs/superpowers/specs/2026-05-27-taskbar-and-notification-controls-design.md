# Design: Taskbar Thumbnail Toolbar + Notification Action Buttons

**Date:** 2026-05-27
**Status:** Approved

---

## Overview

Add media controls (Previous, Play/Pause, Next) in two additional Windows surfaces:

1. **Thumbnail Toolbar** - buttons appear in the Windows taskbar thumbnail preview when the user hovers over the YTM taskbar button. Works in dev and production.
2. **Toast Notification Actions** - buttons appear inside the Windows toast notification that fires on track change. Works in the installed (packaged) app only.

---

## 1. Thumbnail Toolbar

### Icons

Four 20x20px RGBA PNG files, white symbols on transparent background, generated once with Python PIL:

| File | Symbol |
|------|--------|
| `assets/icons/thumbar-prev.png` | Vertical bar + left-pointing triangle |
| `assets/icons/thumbar-play.png` | Right-pointing triangle |
| `assets/icons/thumbar-pause.png` | Two vertical bars |
| `assets/icons/thumbar-next.png` | Right-pointing triangle + vertical bar |

These are already covered by the `assets/**/*` glob in `electron-builder.yml` so no build config changes are needed.

### WindowManager changes

New private method:

```typescript
private updateThumbarButtons(isPlaying: boolean): void
```

- Loads all four icons via `nativeImage.createFromPath(path.join(app.getAppPath(), 'assets', 'icons', 'thumbar-XXX.png'))`
- Calls `this.mainWindow.setThumbarButtons([prev, playOrPause, next])`
- Play button shows `thumbar-play.png` when `isPlaying` is false; Pause button shows `thumbar-pause.png` when `isPlaying` is true
- Each button's `click` handler calls `this.playerBridge.execute(action)`
- If `this.mainWindow` is null, returns early

**Call sites:**
- End of `createMainWindow()` - called with `false` (paused state as default)
- Inside the `state-changed` listener already in `createMainWindow()` - called with `state.isPlaying`

No new public API is needed on `WindowManager`.

### Behaviour notes

- Buttons are visible whenever the main window is in the taskbar (it always is by default)
- If the main window is hidden to tray, the taskbar button disappears and so do the thumbar buttons - this is correct Windows behaviour
- `setThumbarButtons([])` is not explicitly called on destroy; Electron clears them automatically when the window closes

---

## 2. Notification Action Buttons

### Constraint

Production only (`app.isPackaged === true`). Dev mode continues to use the existing plain `Notification`. This avoids registering the dev Electron binary as the `ytm://` protocol handler on the developer's machine.

### Protocol Registration

In `src/main/index.ts`, inside `app.whenReady()`:

```typescript
if (app.isPackaged) {
  app.setAsDefaultProtocolClient('ytm');
}
```

This writes to `HKCU\Software\Classes\ytm` so no elevation is required. It runs on every startup, keeping the registration current after reinstalls.

### Second-Instance Handler

The existing `second-instance` handler in `index.ts` is extended:

```typescript
app.on('second-instance', (_event, argv) => {
  const protocolUrl = argv.find(arg => arg.startsWith('ytm://action/'));
  if (protocolUrl) {
    const action = protocolUrl.replace('ytm://action/', '');
    playerBridge?.execute(action);
  } else {
    windowManager?.focusActiveWindow();
  }
});
```

The action string extracted from the URL matches the keys already accepted by `PlayerBridge.execute()`: `previousTrack`, `playPause`, `nextTrack`.

### NotificationManager changes

New private helper:

```typescript
private escapeXml(s: string): string
```

Escapes `&`, `<`, `>`, `"`, `'` to their XML entities.

New private method:

```typescript
private showToastNotification(
  title: string,
  body: string,
  icon: string | undefined,
  sound: boolean
): void
```

Builds and fires a Windows Toast XML notification:

```xml
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>{title}</text>
      <text>{body}</text>
      <!-- only present when icon path is available -->
      <image placement="appLogoOverride" hint-crop="circle"
             src="file:///{icon path with forward slashes}"/>
    </binding>
  </visual>
  <actions>
    <action content="&#9664;&#9664; Prev"
            arguments="ytm://action/previousTrack"
            activationType="protocol"/>
    <action content="&#9654;&#9646;&#9646; Play/Pause"
            arguments="ytm://action/playPause"
            activationType="protocol"/>
    <action content="Next &#9654;&#9654;"
            arguments="ytm://action/nextTrack"
            activationType="protocol"/>
  </actions>
  <!-- audio element only present when sound is false -->
  <audio silent="true"/>
</toast>
```

`showNotification()` is updated to branch:

```typescript
if (process.platform === 'win32' && app.isPackaged) {
  this.showToastNotification(title, body, icon, sound);
} else {
  // existing plain Notification code unchanged
}
```

The `preview()` method in `NotificationManager` follows the same branch, so the Settings preview button also shows action buttons when running from the installed app.

### Icon path in toast XML

Windows Shell requires a `file://` URL. Conversion:

```typescript
const src = `file:///${icon.replace(/\\/g, '/')}`;
```

The album art is already saved to a temp file on disk by `fetchAlbumArt()`, so the path is always a real filesystem path.

---

## 3. README Updates

- Add **Taskbar media controls** row to the features table
- Add **Notification action buttons** note to the Notifications section, clarifying they appear in the installed app

---

## 4. Files Changed

| File | Type | Summary |
|------|------|---------|
| `assets/icons/thumbar-prev.png` | New | Thumbar previous icon |
| `assets/icons/thumbar-play.png` | New | Thumbar play icon |
| `assets/icons/thumbar-pause.png` | New | Thumbar pause icon |
| `assets/icons/thumbar-next.png` | New | Thumbar next icon |
| `src/main/windowManager.ts` | Modified | Add `updateThumbarButtons()` |
| `src/main/notificationManager.ts` | Modified | Add `showToastNotification()` and `escapeXml()` |
| `src/main/index.ts` | Modified | Protocol registration, extended `second-instance` handler |
| `README.md` | Modified | Document new features |

---

## 5. Out of Scope

- macOS / Linux notification actions (app is Windows-only)
- Like/Dislike buttons in the thumbar (Windows limit is 7 buttons; 3 is the right set for media)
- Volume controls in the thumbar
- Animated icons or progress bar in the thumbnail
