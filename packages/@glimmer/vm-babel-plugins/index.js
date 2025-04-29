import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default function generateVmPlugins(options = {}) {
  let isDebug = options.isDebug ?? true;

  return [
    [
      require.resolve('babel-plugin-debug-macros'),
      {
        debugTools: {
          source: '@glimmer/global-context',
          isDebug,
        },
        externalizeHelpers: {
          module: true,
        },
        flags: [{ source: '@glimmer/env', flags: { DEBUG: isDebug } }],
      },
      'glimmer-vm-debug-macros',
    ],
  ];
}
