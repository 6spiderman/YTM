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

    var playBtn = document.querySelector('#play-pause-button') ||
                  document.querySelector('.play-pause-button');
    var isPlaying = playBtn ? playBtn.getAttribute('aria-label') === 'Pause' : false;

    var likeBtn = document.querySelector('#like-button-renderer .like') ||
                  document.querySelector('ytmusic-like-button-renderer [aria-label="Like"]');
    var dislikeBtn = document.querySelector('#like-button-renderer .dislike') ||
                     document.querySelector('ytmusic-like-button-renderer [aria-label="Dislike"]');
    var likeStatus = 'none';
    if (likeBtn && likeBtn.getAttribute('aria-pressed') === 'true') likeStatus = 'like';
    else if (dislikeBtn && dislikeBtn.getAttribute('aria-pressed') === 'true') likeStatus = 'dislike';

    var volSlider = document.querySelector('#volume-slider');
    var volume = volSlider ? Number(volSlider.value) : 100;

    return JSON.stringify({ currentTrack: title, currentArtist: artist,
      albumArtUrl: albumArt, isPlaying: isPlaying,
      likeStatus: likeStatus, volume: volume });
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
      var b = document.querySelector('#like-button-renderer .like') ||
              document.querySelector('ytmusic-like-button-renderer [aria-label="Like"]');
      if (b) b.click();
    })()`,
  dislikeTrack: `
    (function() {
      var b = document.querySelector('#like-button-renderer .dislike') ||
              document.querySelector('ytmusic-like-button-renderer [aria-label="Dislike"]');
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
      if (JSON.stringify(state) !== JSON.stringify(this.lastState)) {
        this.lastState = state;
        this.emit('state-changed', state);
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
