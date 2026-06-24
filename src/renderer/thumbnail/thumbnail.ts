const titleEl = document.getElementById('track-title')!;
const artistEl = document.getElementById('track-artist')!;
const albumArtEl = document.getElementById('album-art') as HTMLImageElement;

window.miniApi.onStateChanged((state) => {
  titleEl.textContent = state.currentTrack || 'Not playing';
  artistEl.textContent = state.currentArtist || '';
  if (state.albumArtUrl) {
    albumArtEl.src = state.albumArtUrl;
    albumArtEl.classList.add('visible');
  } else {
    albumArtEl.classList.remove('visible');
  }
});
