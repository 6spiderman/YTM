document.getElementById('mini-btn')?.addEventListener('click', () => {
  window.api.toggleMiniPlayer();
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
