const titleEl = document.getElementById('track-title')!;
const artistEl = document.getElementById('track-artist')!;
const albumArtEl = document.getElementById('album-art') as HTMLImageElement;
const playBtn = document.getElementById('play-btn')!;

window.miniApi.onStateChanged((state) => {
  titleEl.textContent = state.currentTrack || 'Not playing';
  artistEl.textContent = state.currentArtist || '';
  playBtn.textContent = state.isPlaying ? '⏸' : '▶';
  if (state.albumArtUrl) {
    albumArtEl.src = state.albumArtUrl;
    albumArtEl.style.display = 'block';
  } else {
    albumArtEl.src = '';
    albumArtEl.style.display = 'none';
  }
});

document.getElementById('prev-btn')?.addEventListener('click', () => {
  window.miniApi.sendAction('previousTrack');
});

document.getElementById('play-btn')?.addEventListener('click', () => {
  window.miniApi.sendAction('playPause');
});

document.getElementById('next-btn')?.addEventListener('click', () => {
  window.miniApi.sendAction('nextTrack');
});

document.getElementById('expand-btn')?.addEventListener('click', () => {
  window.miniApi.expandPlayer();
});
