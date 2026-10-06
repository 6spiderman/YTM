document.getElementById('mini-btn')?.addEventListener('click', () => {
  window.api.toggleMiniPlayer();
});

document.getElementById('reload-btn')?.addEventListener('click', () => {
  window.api.reloadPage();
});

document.getElementById('settings-btn')?.addEventListener('click', () => {
  window.api.openSettings();
});

document.getElementById('min-btn')?.addEventListener('click', () => {
  window.api.minimizeWindow();
});

document.getElementById('max-btn')?.addEventListener('click', () => {
  window.api.maximizeWindow();
});

document.getElementById('close-btn')?.addEventListener('click', () => {
  window.api.closeWindow();
});

// Tell the main process the real viewport size (used for the YouTube view layout on Linux).
const reportViewport = () => window.api.reportViewport?.(window.innerWidth, window.innerHeight);
window.addEventListener('resize', reportViewport);
reportViewport();
