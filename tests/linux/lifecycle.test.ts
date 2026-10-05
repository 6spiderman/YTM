import { installTerminationHandlers } from '../../src/main/platform/linux/lifecycle';

describe('installTerminationHandlers', () => {
  it('quits on SIGTERM, SIGINT and SIGHUP', () => {
    const on = jest.fn();
    const quit = jest.fn();
    installTerminationHandlers(quit, { on } as never);
    expect(on.mock.calls.map((c) => c[0]).sort()).toEqual(['SIGHUP', 'SIGINT', 'SIGTERM']);
    on.mock.calls.forEach((c) => c[1]());
    expect(quit).toHaveBeenCalledTimes(3);
  });
});
