const esbuild = require('esbuild');

const entries = [
  {
    entryPoints: ['src/renderer/main-window/index.ts'],
    outfile: 'dist/renderer/main-window/index.js',
  },
  {
    entryPoints: ['src/renderer/mini-player/mini.ts'],
    outfile: 'dist/renderer/mini-player/mini.js',
  },
  {
    entryPoints: ['src/renderer/settings/settings.ts'],
    outfile: 'dist/renderer/settings/settings.js',
  },
];

const baseOptions = {
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'chrome120',
};

const isWatch = process.argv.includes('--watch');

async function main() {
  if (isWatch) {
    const contexts = await Promise.all(
      entries.map(e => esbuild.context({ ...baseOptions, ...e }))
    );
    await Promise.all(contexts.map(ctx => ctx.watch()));
    console.log('[esbuild] Watching renderer files...');
  } else {
    await Promise.all(entries.map(e => esbuild.build({ ...baseOptions, ...e })));
    console.log('[esbuild] Renderer bundled.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
