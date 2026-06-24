import { WebContents } from 'electron';
import { EventEmitter } from 'events';
import { PlayerState } from '../types';

const STATE_POLL_INTERVAL = 1000;

const STATE_SCRIPT = `
(function() {
  try {
    var bar = document.querySelector('ytmusic-player-bar');
    if (!bar) return JSON.stringify(null);

    function getAttr(sel, attr) {
      var el = document.querySelector(sel);
      return el ? (el.getAttribute(attr) || el[attr] || '') : '';
    }
    function getText(sel) {
      var el = document.querySelector(sel);
      return el ? (el.textContent || '').trim() : '';
    }

    var title = getText('.title.ytmusic-player-bar') ||
                getAttr('.ytmusic-player-bar [title]', 'title');
    var artist = getText('.byline.ytmusic-player-bar a') ||
                 getText('.byline.ytmusic-player-bar');
    var albumArt = getAttr('#thumbnail img', 'src') ||
                   getAttr('ytmusic-player-bar img', 'src') || '';

    // isPlaying from video element; currentTime/duration from YTM's progress
    // slider (aria-valuenow/aria-valuemax) to avoid picking up the wrong video
    // element when YouTube Music has multiple <video> tags on the page.
    var videoEl = document.querySelector('video');
    var isPlaying = false, currentTime = 0, duration = 0;
    if (videoEl) {
      isPlaying = !videoEl.paused && !videoEl.ended && videoEl.readyState > 2;
    } else {
      var playBtn = document.querySelector('#play-pause-button') ||
                    document.querySelector('.play-pause-button');
      if (playBtn) {
        var label = (playBtn.getAttribute('aria-label') || '').toLowerCase();
        isPlaying = label.includes('pause');
      }
    }
    var sliderEl = document.querySelector('#progress-bar');
    if (sliderEl) {
      var vNow = parseFloat(sliderEl.getAttribute('aria-valuenow') || '-1');
      var vMax = parseFloat(sliderEl.getAttribute('aria-valuemax') || '0');
      if (vNow >= 0 && vMax > 0) {
        currentTime = Math.floor(vNow);
        duration = Math.floor(vMax);
      } else if (videoEl) {
        currentTime = Math.floor(videoEl.currentTime || 0);
        duration = isFinite(videoEl.duration) ? Math.floor(videoEl.duration) : 0;
      }
    } else if (videoEl) {
      currentTime = Math.floor(videoEl.currentTime || 0);
      duration = isFinite(videoEl.duration) ? Math.floor(videoEl.duration) : 0;
    }

    var likeBtn = document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer [aria-label="Like"]') ||
                  document.querySelector('ytmusic-like-button-renderer [aria-label="Like"]') ||
                  document.querySelector('ytmusic-like-button-renderer button:first-of-type');
    var dislikeBtn = document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer [aria-label="Dislike"]') ||
                     document.querySelector('ytmusic-like-button-renderer [aria-label="Dislike"]') ||
                     document.querySelector('ytmusic-like-button-renderer button:last-of-type');
    var likeStatus = 'none';
    if (likeBtn && (likeBtn.getAttribute('aria-pressed') === 'true' || likeBtn.classList.contains('active'))) likeStatus = 'like';
    else if (dislikeBtn && (dislikeBtn.getAttribute('aria-pressed') === 'true' || dislikeBtn.classList.contains('active'))) likeStatus = 'dislike';

    var volSlider = document.querySelector('#volume-slider');
    var volume = volSlider ? Number(volSlider.value) : 100;

    var shuffleBtn = document.querySelector('ytmusic-player-bar [aria-label*="Shuffle"]') ||
                     document.querySelector('#shuffle-button');
    var isShuffled = shuffleBtn ? shuffleBtn.getAttribute('aria-pressed') === 'true' : false;

    var repeatBtn = document.querySelector('ytmusic-player-bar [aria-label*="Repeat"]') ||
                    document.querySelector('#repeat-button');
    var repeatMode = 'none';
    if (repeatBtn) {
      var rLabel = (repeatBtn.getAttribute('aria-label') || '').toLowerCase();
      var rPressed = repeatBtn.getAttribute('aria-pressed') === 'true';
      if (rLabel.includes('one') || rLabel.includes('single')) repeatMode = 'one';
      else if (rPressed || rLabel.includes('all')) repeatMode = 'all';
    }

    return JSON.stringify({
      currentTrack: title, currentArtist: artist,
      albumArtUrl: albumArt, isPlaying: isPlaying,
      likeStatus: likeStatus, volume: volume,
      currentTime: currentTime, duration: duration,
      isShuffled: isShuffled, repeatMode: repeatMode
    });
  } catch(e) {
    return JSON.stringify(null);
  }
})()
`;

const ACTIONS: Record<string, string> = {
  playPause: `
    (function() {
      var btn = document.querySelector('#play-pause-button') ||
                document.querySelector('.play-pause-button');
      if (btn) btn.click();
    })()`,
  nextTrack: `(function(){ var b = document.querySelector('.next-button'); if(b) b.click(); })()`,
  previousTrack: `(function(){ var b = document.querySelector('.previous-button'); if(b) b.click(); })()`,
  likeTrack: `
    (function() {
      var b = document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer [aria-label="Like"]') ||
              document.querySelector('ytmusic-like-button-renderer [aria-label="Like"]') ||
              document.querySelector('ytmusic-like-button-renderer button:first-of-type');
      if (b) b.click();
    })()`,
  dislikeTrack: `
    (function() {
      var b = document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer [aria-label="Dislike"]') ||
              document.querySelector('ytmusic-like-button-renderer [aria-label="Dislike"]') ||
              document.querySelector('ytmusic-like-button-renderer button:last-of-type');
      if (b) b.click();
    })()`,
  toggleShuffle: `
    (function() {
      var b = document.querySelector('ytmusic-player-bar [aria-label*="Shuffle"]') ||
              document.querySelector('#shuffle-button');
      if (b) b.click();
    })()`,
  toggleRepeat: `
    (function() {
      var b = document.querySelector('ytmusic-player-bar [aria-label*="Repeat"]') ||
              document.querySelector('#repeat-button');
      if (b) b.click();
    })()`,
};

export class PlayerBridge extends EventEmitter {
  private webContents: WebContents | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastState: PlayerState | null = null;
  private volumeStep = 5;

  attachWebContents(wc: WebContents): void {
    this.webContents = wc;
    this.startPolling();
  }

  setVolumeStep(step: number): void {
    this.volumeStep = step;
  }

  private startPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.poll(), STATE_POLL_INTERVAL);
  }

  private async poll(): Promise<void> {
    if (!this.webContents || this.webContents.isDestroyed()) return;
    try {
      const raw = await this.webContents.executeJavaScript(STATE_SCRIPT);
      if (!raw) return;
      const state: PlayerState = JSON.parse(raw);

      // Compare without currentTime so a ticking clock doesn't spam state-changed.
      // Tray menu only rebuilds on meaningful changes; mini-player progress is
      // served by the always-updated lastState sent on each poll.
      const sig = (s: PlayerState) =>
        JSON.stringify({ ...s, currentTime: 0 });

      if (sig(state) !== sig(this.lastState ?? ({} as PlayerState))) {
        this.lastState = state;
        this.emit('state-changed', state);
      } else if (state.currentTime !== this.lastState?.currentTime) {
        // Only time ticked - update lastState silently and emit a lightweight event
        this.lastState = { ...this.lastState!, currentTime: state.currentTime };
        this.emit('progress-updated', state.currentTime, state.duration);
      }
    } catch (err) {
      this.emit('bridge:selector-error', err);
    }
  }

  async execute(action: string): Promise<void> {
    if (!this.webContents || this.webContents.isDestroyed()) return;
    try {
      if (action === 'volumeUp' || action === 'volumeDown') {
        await this.adjustVolume(action === 'volumeUp' ? this.volumeStep : -this.volumeStep);
        return;
      }
      const script = ACTIONS[action];
      if (script) {
        await this.webContents.executeJavaScript(script);
      }
    } catch (err) {
      this.emit('bridge:selector-error', err);
    }
  }

  async seek(position: number): Promise<void> {
    if (!this.webContents || this.webContents.isDestroyed()) return;
    const script = `
      (function() {
        var v = document.querySelector('video');
        if (v && isFinite(${position})) v.currentTime = ${position};
      })()
    `;
    try {
      await this.webContents.executeJavaScript(script);
    } catch (err) {
      this.emit('bridge:selector-error', err);
    }
  }

  async setVolume(value: number): Promise<void> {
    if (!this.webContents || this.webContents.isDestroyed()) return;
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    const script = `
      (function() {
        var s = document.querySelector('#volume-slider');
        if (!s) return;
        s.value = ${clamped};
        s.dispatchEvent(new Event('change', { bubbles: true }));
        s.dispatchEvent(new InputEvent('input', { bubbles: true }));
      })()
    `;
    try {
      await this.webContents.executeJavaScript(script);
    } catch (err) {
      this.emit('bridge:selector-error', err);
    }
  }

  private async adjustVolume(delta: number): Promise<void> {
    if (!this.webContents || this.webContents.isDestroyed()) return;
    const script = `
      (function() {
        var s = document.querySelector('#volume-slider');
        if (!s) return;
        var v = Math.min(100, Math.max(0, Number(s.value) + ${delta}));
        s.value = v;
        s.dispatchEvent(new Event('change', { bubbles: true }));
        s.dispatchEvent(new InputEvent('input', { bubbles: true }));
      })()
    `;
    await this.webContents.executeJavaScript(script);
  }

  getLastState(): PlayerState | null {
    return this.lastState;
  }

  destroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.webContents = null;
  }
}
