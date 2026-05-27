import { renderTemplate } from '../src/main/notificationManager';

describe('renderTemplate', () => {
  it('replaces {artist} token', () => {
    expect(renderTemplate('{artist}', 'Daft Punk', 'Get Lucky')).toBe('Daft Punk');
  });

  it('replaces {title} token', () => {
    expect(renderTemplate('{title}', 'Daft Punk', 'Get Lucky')).toBe('Get Lucky');
  });

  it('replaces both tokens in one string', () => {
    expect(renderTemplate('{artist} - {title}', 'Daft Punk', 'Get Lucky'))
      .toBe('Daft Punk - Get Lucky');
  });

  it('returns static text unchanged', () => {
    expect(renderTemplate('Now Playing', 'Daft Punk', 'Get Lucky')).toBe('Now Playing');
  });

  it('handles empty artist gracefully', () => {
    expect(renderTemplate('{artist}', '', 'Get Lucky')).toBe('');
  });
});
