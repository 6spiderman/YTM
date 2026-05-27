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

  private showNotification(title: string, body: string, icon: string | undefined, sound: boolean): void {
    const n = new Notification({
      title,
      body,
      icon,
      silent: !sound,
    });
    n.show();
  }

  private fetchAlbumArt(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const tmpPath = path.join(app.getPath('temp'), 'ytm-album-art.jpg');
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
