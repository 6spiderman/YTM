import { detectNativeWayland, waylandPositionOverride } from '../../src/main/platform/linux/displayServer';

describe('detectNativeWayland', () => {
  it.each([
    ['x11', { XDG_SESSION_TYPE: 'wayland', WAYLAND_DISPLAY: 'wayland-0' }, false],
    ['wayland', {}, true],
    ['', { XDG_SESSION_TYPE: 'wayland' }, true],
    ['auto', { WAYLAND_DISPLAY: 'wayland-0' }, true],
    ['', { XDG_SESSION_TYPE: 'x11' }, false],
    ['', {}, false],
  ])('ozone switch %p with env %j -> %p', (ozone, env, expected) => {
    expect(detectNativeWayland(ozone, env as NodeJS.ProcessEnv)).toBe(expected);
  });
});

describe('waylandPositionOverride', () => {
  it('keeps the previously saved position on native Wayland', () => {
    expect(waylandPositionOverride({ x: 12, y: 34 }, true)).toEqual({ x: 12, y: 34 });
  });
  it('keeps an unset position unset on native Wayland', () => {
    expect(waylandPositionOverride({}, true)).toEqual({ x: undefined, y: undefined });
  });
  it('does not override anything under X11/XWayland', () => {
    expect(waylandPositionOverride({ x: 12, y: 34 }, false)).toEqual({});
  });
});
