module.exports = function buildDebugMacrosPlugin(isDebug) {
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
