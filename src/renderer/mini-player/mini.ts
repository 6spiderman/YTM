const titleEl = document.getElementById('track-title')!;
const artistEl = document.getElementById('track-artist')!;
const albumArtEl = document.getElementById('album-art') as HTMLImageElement;
const playBtn = document.getElementById('play-btn')!;
const shuffleBtn = document.getElementById('shuffle-btn')!;
const repeatBtn = document.getElementById('repeat-btn')!;
const likeBtn = document.getElementById('like-btn')!;
const dislikeBtn = document.getElementById('dislike-btn')!;
const volControl = document.getElementById('volume-control') as HTMLInputElement;
const progressControl = document.getElementById('progress-control') as HTMLInputElement;
const currentTimeEl = document.getElementById('current-time')!;
const totalTimeEl = document.getElementById('total-time')!;

function fmt(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateProgress(currentTime: number, duration: number): void {
  if (document.activeElement === progressControl) return;
  progressControl.max = String(duration || 100);
  progressControl.value = String(currentTime);
  currentTimeEl.textContent = fmt(currentTime);
  totalTimeEl.textContent = fmt(duration);
}

window.miniApi.onStateChanged((state) => {
  titleEl.textContent = state.currentTrack || 'Not playing';
  artistEl.textContent = state.currentArtist || '';

  playBtn.classList.toggle('playing', state.isPlaying);

  if (state.albumArtUrl) {
    albumArtEl.src = state.albumArtUrl;
    albumArtEl.style.display = 'block';
  } else {
    albumArtEl.style.display = 'none';
  }

  likeBtn.classList.toggle('liked', state.likeStatus === 'like');
  dislikeBtn.classList.toggle('disliked', state.likeStatus === 'dislike');

  shuffleBtn.classList.toggle('active', state.isShuffled);

  repeatBtn.classList.remove('active', 'repeat-one');
  if (state.repeatMode === 'all') repeatBtn.classList.add('active');
  else if (state.repeatMode === 'one') repeatBtn.classList.add('active', 'repeat-one');

  if (document.activeElement !== volControl) {
    volControl.value = String(state.volume);
  }

  updateProgress(state.currentTime, state.duration);
});

// Lightweight progress ticks from the bridge (no full state-changed emit)
window.miniApi.onProgressUpdated((currentTime, duration) => {
  updateProgress(currentTime, duration);
});

document.getElementById('shuffle-btn')?.addEventListener('click', () => {
  window.miniApi.sendAction('toggleShuffle');
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

document.getElementById('repeat-btn')?.addEventListener('click', () => {
  window.miniApi.sendAction('toggleRepeat');
});

document.getElementById('like-btn')?.addEventListener('click', () => {
  window.miniApi.sendAction('likeTrack');
});

document.getElementById('dislike-btn')?.addEventListener('click', () => {
  window.miniApi.sendAction('dislikeTrack');
});

document.getElementById('expand-btn')?.addEventListener('click', () => {
  window.miniApi.expandPlayer();
});

volControl.addEventListener('input', () => {
  window.miniApi.setVolume(Number(volControl.value));
});

// Seek on release so we don't spam seeks while dragging
progressControl.addEventListener('change', () => {
  window.miniApi.seek(Number(progressControl.value));
});
