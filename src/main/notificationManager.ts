import { Notification, net, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { SettingsManager } from './settingsManager';
import { PlayerState } from '../types';

export function renderTemplate(template: string, artist: string, title: string): string {
  return template.replace('{artist}', artist).replace('{title}', title);
}

export class NotificationManager {
  private lastTrack = '';

  constructor(private settings: SettingsManager) {}

  onStateChanged(state: PlayerState): void {
    const { notifications } = this.settings.get();
    if (!notifications.enabled) return;
    if (state.currentTrack === this.lastTrack) return;
    if (!state.currentTrack) return;

    this.lastTrack = state.currentTrack;
    this.fire(state);
  }

  preview(): void {
    const state: PlayerState = {
      currentTrack: 'Test Song',
      currentArtist: 'Test Artist',
      albumArtUrl: '',
      isPlaying: true,
      likeStatus: 'none',
      volume: 100,
    };
    this.fire(state);
  }

  private fire(state: PlayerState): void {
    const { notifications } = this.settings.get();
    const title = renderTemplate(notifications.titleTemplate, state.currentArtist, state.currentTrack);
    const body = renderTemplate(notifications.bodyTemplate, state.currentArtist, state.currentTrack);

    if (notifications.showAlbumArt && state.albumArtUrl) {
      this.fetchAlbumArt(state.albumArtUrl)
        .then(iconPath => this.showNotification(title, body, iconPath, notifications.playSound))
        .catch(() => this.showNotification(title, body, undefined, notifications.playSound));
    } else {
      this.showNotification(title, body, undefined, notifications.playSound);
    }
  }

  private escapeXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private showToastNotification(
    title: string,
    body: string,
    icon: string | undefined,
    sound: boolean
  ): void {
    try {
      const imgXml = icon
        ? `<image placement="appLogoOverride" hint-crop="circle" src="file:///${icon.replace(/\\/g, '/')}"/>`
        : '';
      const audioXml = sound ? '' : '<audio silent="true"/>';

      const xml = `<toast><visual><binding template="ToastGeneric"><text>${this.escapeXml(title)}</text><text>${this.escapeXml(body)}</text>${imgXml}</binding></visual><actions><action content="&#9664;&#9664; Prev" arguments="ytm://action/previousTrack" activationType="protocol"/><action content="&#9199; Play / Pause" arguments="ytm://action/playPause" activationType="protocol"/><action content="Next &#9654;&#9654;" arguments="ytm://action/nextTrack" activationType="protocol"/></actions>${audioXml}</toast>`;

      console.log('[NotificationManager] toastXml:', xml);

      const n = new Notification({ toastXml: xml });
      n.on('failed', (_event, error) => {
        console.error('[NotificationManager] Toast notification failed:', error);
      });
      n.on('show', () => {
        console.log('[NotificationManager] Toast notification shown successfully');
      });
      n.show();
    } catch (err) {
      console.error('[NotificationManager] showToastNotification threw:', err);
      // Fall back to plain notification
      const n = new Notification({ title, body, icon, silent: !sound });
      n.show();
    }
  }

  private showNotification(title: string, body: string, icon: string | undefined, sound: boolean): void {
    if (process.platform === 'win32') {
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

  private fetchAlbumArt(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const tmpPath = path.join(app.getPath('temp'), `ytm-album-art-${Date.now()}.jpg`);
      const request = net.request(url);
      const chunks: Buffer[] = [];

      request.on('response', (response) => {
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          try {
            fs.writeFileSync(tmpPath, Buffer.concat(chunks));
            resolve(tmpPath);
          } catch {
            reject(new Error('Failed to write album art'));
          }
        });
        response.on('error', reject);
      });

      request.on('error', reject);
      request.end();
    });
  }
}
