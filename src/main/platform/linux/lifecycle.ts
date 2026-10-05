/**
 * Without this a SIGTERM/SIGINT/SIGHUP (logout, `kill`, terminal close) leaves the app running:
 * the main window's `close` handler vetoes the close while `minimiseToTray` is on and `quitting`
 * is false, so Electron never exits.
 */
export function installTerminationHandlers(
  quit: () => void,
  proc: Pick<NodeJS.Process, 'on'> = process
): void {
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) {
    proc.on(signal, quit);
  }
}
