import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function defaultTo<T, U>(value: T, defaultVal: U): Exclude<T, undefined> | U {
  return (value === undefined ? defaultVal : value) as Exclude<T, undefined> | U;
}

interface Options {
  isDebug?: boolean;
  __loadPlugins?: boolean;
}

export default function generateVmPlugins(
  options: Options = {}
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
): import('@babel/core').PluginItem[] {
  let isDebug = defaultTo(options.isDebug, true);
  let __loadPlugins = defaultTo(options.__loadPlugins, false);

  return [
    [
      __loadPlugins
        ? require('babel-plugin-debug-macros')
        : require.resolve('babel-plugin-debug-macros'),
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
