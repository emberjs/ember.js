module.exports = function buildDebugMacrosPlugin(debugMode) {
  let isDebug = debugMode === 'production' ? false : debugMode;
  return [
    require.resolve('babel-plugin-debug-macros'),
    {
      debugTools: {
        source: '@ember/debug',
        assertPredicateIndex: 1,
        isDebug,
      },
      externalizeHelpers: {
        module: true,
      },
      flags: [{ source: '@glimmer/env', flags: { DEBUG: isDebug } }],
    },
  ];
};
