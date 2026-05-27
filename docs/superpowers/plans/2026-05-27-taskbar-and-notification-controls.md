# Taskbar Thumbnail Toolbar + Notification Action Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Previous / Play-Pause / Next media controls to the Windows taskbar thumbnail toolbar (hover preview) and to Windows toast notification action buttons.

**Architecture:** Thumbnail toolbar uses Electron's `setThumbarButtons` API wired into `WindowManager`, updated on every `state-changed` event. Notification actions use Windows Toast XML (`toastXml`) with `activationType="protocol"` routing clicks through a registered `ytm://` custom protocol back to the running app's `second-instance` handler, which calls `PlayerBridge.execute()`. Notification actions are production-only to avoid polluting the dev machine's protocol registry.

**Tech Stack:** Electron 30, TypeScript 5, Python 3 + Pillow (icon generation only), electron-builder 24 (NSIS installer)

---

## File Map

| File | Change |
|------|--------|
| `assets/icons/thumbar-prev.png` | New - 20x20 white-on-transparent PNG |
| `assets/icons/thumbar-play.png` | New - 20x20 white-on-transparent PNG |
| `assets/icons/thumbar-pause.png` | New - 20x20 white-on-transparent PNG |
| `assets/icons/thumbar-next.png` | New - 20x20 white-on-transparent PNG |
| `src/main/windowManager.ts` | Add `updateThumbarButtons(isPlaying)` private method and two call sites |
| `src/main/notificationManager.ts` | Add `escapeXml()` helper and `showToastNotification()` method, branch in `showNotification()` |
| `src/main/index.ts` | Register `ytm://` protocol client (packaged only), extend `second-instance` handler |
| `README.md` | Add two entries to features table, update Notifications section |

---

## Task 1: Generate Thumbar Icon PNGs

**Files:**
- Create: `assets/icons/thumbar-prev.png`
- Create: `assets/icons/thumbar-play.png`
- Create: `assets/icons/thumbar-pause.png`
- Create: `assets/icons/thumbar-next.png`

- [ ] **Step 1: Run the Python icon generation script**

```bash
python -c "
from PIL import Image, ImageDraw

W = (255, 255, 255, 255)  # white opaque
T = (0, 0, 0, 0)          # transparent

def blank():
    return Image.new('RGBA', (20, 20), T)

# Previous: vertical bar (left) + left-pointing triangle
img = blank(); d = ImageDraw.Draw(img)
d.rectangle([2, 3, 4, 16], fill=W)
d.polygon([6, 10, 14, 3, 14, 17], fill=W)
img.save('assets/icons/thumbar-prev.png')

# Play: right-pointing triangle centered
img = blank(); d = ImageDraw.Draw(img)
d.polygon([4, 2, 4, 18, 17, 10], fill=W)
img.save('assets/icons/thumbar-play.png')

# Pause: two vertical bars
img = blank(); d = ImageDraw.Draw(img)
d.rectangle([3, 3, 7, 17], fill=W)
d.rectangle([12, 3, 16, 17], fill=W)
img.save('assets/icons/thumbar-pause.png')

# Next: right-pointing triangle + vertical bar (right)
img = blank(); d = ImageDraw.Draw(img)
d.polygon([4, 3, 4, 17, 13, 10], fill=W)
d.rectangle([15, 3, 17, 17], fill=W)
img.save('assets/icons/thumbar-next.png')

print('Icons generated.')
"
```

Expected output: `Icons generated.`

- [ ] **Step 2: Verify the four files exist**

```bash
ls assets/icons/thumbar-*.png
```

Expected: four files listed.

- [ ] **Step 3: Commit**

```bash
git add assets/icons/thumbar-prev.png assets/icons/thumbar-play.png assets/icons/thumbar-pause.png assets/icons/thumbar-next.png
git commit -m "feat: add thumbar media control icons"
```

---

## Task 2: Thumbnail Toolbar in WindowManager

**Files:**
- Modify: `src/main/windowManager.ts`

- [ ] **Step 1: Add `nativeImage` to the electron import at the top of `windowManager.ts`**

Current line 1:
```typescript
import { BrowserWindow, WebContentsView, app } from 'electron';
```

Replace with:
```typescript
import { BrowserWindow, WebContentsView, app, nativeImage } from 'electron';
```

- [ ] **Step 2: Add the `updateThumbarButtons` private method**

Add this method directly before the existing `getYtmWebContents()` method at the bottom of the `WindowManager` class:

```typescript
  private updateThumbarButtons(isPlaying: boolean): void {
    if (!this.mainWindow) return;

    const icon = (name: string) =>
      nativeImage.createFromPath(
        path.join(app.getAppPath(), 'assets', 'icons', `${name}.png`)
      );

    this.mainWindow.setThumbarButtons([
      {
        tooltip: 'Previous Track',
        icon: icon('thumbar-prev'),
        click: () => { this.playerBridge.execute('previousTrack'); },
      },
      {
        tooltip: isPlaying ? 'Pause' : 'Play',
        icon: icon(isPlaying ? 'thumbar-pause' : 'thumbar-play'),
        click: () => { this.playerBridge.execute('playPause'); },
      },
      {
        tooltip: 'Next Track',
        icon: icon('thumbar-next'),
        click: () => { this.playerBridge.execute('nextTrack'); },
      },
    ]);
  }
```

- [ ] **Step 3: Call `updateThumbarButtons` at the end of `createMainWindow()`**

Find the `state-changed` listener block inside `createMainWindow()`:

```typescript
    // Forward player state to renderers
    this.playerBridge.on('state-changed', (state) => {
      this.broadcastState(state);
    });
```

Replace with:

```typescript
    // Forward player state to renderers and update thumbar
    this.playerBridge.on('state-changed', (state) => {
      this.broadcastState(state);
      this.updateThumbarButtons(state.isPlaying);
    });

    // Initialise thumbar buttons (paused state until first track)
    this.updateThumbarButtons(false);
```

- [ ] **Step 4: Compile and verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 5: Commit**

```bash
git add src/main/windowManager.ts
git commit -m "feat: add thumbnail toolbar media controls to taskbar hover preview"
```

---

## Task 3: Protocol Registration and Second-Instance Routing

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: Extend the `second-instance` handler**

Find the existing handler in `index.ts`:

```typescript
  app.on('second-instance', () => {
    windowManager?.focusActiveWindow();
  });
```

Replace with:

```typescript
  app.on('second-instance', (_event, argv) => {
    const protocolUrl = argv.find((arg: string) => arg.startsWith('ytm://action/'));
    if (protocolUrl) {
      const action = protocolUrl.replace('ytm://action/', '');
      playerBridge?.execute(action);
    } else {
      windowManager?.focusActiveWindow();
    }
  });
```

- [ ] **Step 2: Register the `ytm://` protocol client in `whenReady`**

Find this line inside `app.whenReady().then(() => {`:

```typescript
    app.setAppUserModelId('YTM');
```

Add the protocol registration immediately after it:

```typescript
    app.setAppUserModelId('YTM');
    if (app.isPackaged) {
      app.setAsDefaultProtocolClient('ytm');
    }
```

- [ ] **Step 3: Compile and verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 4: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: register ytm:// protocol and route notification button clicks to player"
```

---

## Task 4: Toast Notification Action Buttons

**Files:**
- Modify: `src/main/notificationManager.ts`

- [ ] **Step 1: Add the `escapeXml` private helper method**

Add this method inside the `NotificationManager` class, before `showNotification`:

```typescript
  private escapeXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
```

- [ ] **Step 2: Add the `showToastNotification` private method**

Add this method immediately after `escapeXml`:

```typescript
  private showToastNotification(
    title: string,
    body: string,
    icon: string | undefined,
    sound: boolean
  ): void {
    const imgXml = icon
      ? `<image placement="appLogoOverride" hint-crop="circle" src="file:///${icon.replace(/\\/g, '/')}"/>`
      : '';
    const audioXml = sound ? '' : '<audio silent="true"/>';

    const xml = `<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>${this.escapeXml(title)}</text>
      <text>${this.escapeXml(body)}</text>
      ${imgXml}
    </binding>
  </visual>
  <actions>
    <action content="&#9664;&#9664; Prev"
            arguments="ytm://action/previousTrack"
            activationType="protocol"/>
    <action content="&#9199; Play / Pause"
            arguments="ytm://action/playPause"
            activationType="protocol"/>
    <action content="Next &#9654;&#9654;"
            arguments="ytm://action/nextTrack"
            activationType="protocol"/>
  </actions>
  ${audioXml}
</toast>`;

    const n = new Notification({ toastXml: xml });
    n.show();
  }
```

- [ ] **Step 3: Branch `showNotification` to use toast XML in production**

Find the existing `showNotification` method:

```typescript
  private showNotification(title: string, body: string, icon: string | undefined, sound: boolean): void {
    const n = new Notification({
      title,
      body,
      icon,
      silent: !sound,
    });
    n.show();
  }
```

Replace with:

```typescript
  private showNotification(title: string, body: string, icon: string | undefined, sound: boolean): void {
    if (process.platform === 'win32' && app.isPackaged) {
      this.showToastNotification(title, body, icon, sound);
    } else {
      const n = new Notification({
        title,
        body,
        icon,
        silent: !sound,
      });
      n.show();
    }
  }
```

- [ ] **Step 4: Compile and verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 5: Run tests to confirm nothing broken**

```bash
npm test
```

Expected: 16 tests pass across 3 suites.

- [ ] **Step 6: Commit**

```bash
git add src/main/notificationManager.ts
git commit -m "feat: add action buttons to Windows toast notifications via toastXml"
```

---

## Task 5: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add taskbar media controls row to the features table**

Find the features table row:

```markdown
| 🔔 **Track notifications** | Windows toast notification on every track change, with album art |
```

Add a new row immediately after it:

```markdown
| 🖱️ **Taskbar media controls** | Previous / Play-Pause / Next buttons in the taskbar thumbnail on hover |
```

- [ ] **Step 2: Add notification action buttons note to the Notifications section**

Find this paragraph in the Notifications section of the settings table:

```markdown
| Play notification sound | Play the Windows notification sound |
```

Add a new row after it:

```markdown
| Action buttons | Previous, Play/Pause, and Next buttons appear directly in the notification (installed app only) |
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document taskbar media controls and notification action buttons"
```

---

## Task 6: Build and Verify

- [ ] **Step 1: Run the full build**

```bash
npm run build
```

Expected output ends with:
```
• building block map  blockMapFile=dist-installer\YTM Setup 1.0.0.exe.blockmap
```

- [ ] **Step 2: Confirm thumbar icons are bundled**

```bash
ls dist-installer/win-unpacked/resources/app.asar.unpacked 2>/dev/null || node -e "
const asar = require('asar');
const list = asar.listPackage('dist-installer/win-unpacked/resources/app.asar');
const icons = list.filter(f => f.includes('thumbar'));
console.log(icons.length === 4 ? 'OK - 4 thumbar icons found' : 'MISSING: ' + JSON.stringify(icons));
" 2>/dev/null || echo "Verify manually: install the app and hover over taskbar button"
```

> If the asar check is unavailable, install `dist-installer/YTM Setup 1.0.0.exe` and verify manually (Step 3).

- [ ] **Step 3: Manual smoke test (after installing)**

1. Install `dist-installer\YTM Setup 1.0.0.exe`
2. Launch YTM, play a song
3. Hover over the YTM taskbar button - verify three buttons (Prev, Pause, Next) appear in the thumbnail
4. Click each button - verify it controls playback
5. Wait for a track change - verify the toast notification appears with three action buttons at the bottom
6. Click each notification button - verify playback responds without the YTM window coming to the foreground

- [ ] **Step 4: Final commit if any fixes were needed, otherwise done**

```bash
git status
# Only commit if there are outstanding changes from smoke test fixes
```
