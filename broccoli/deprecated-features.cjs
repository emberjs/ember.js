'use strict';

// Canonical build-time manifest of shakable deprecations. Each key must match
// both an `export const <KEY> = true` in packages/@ember/deprecated-features
// and a DEPRECATIONS registry key in @ember/-internals/deprecations (a
// conformance test enforces the latter pairing).
const FLAGS = Object.freeze({
  DEPRECATE_COMPARABLE_MIXIN: Object.freeze({
    id: 'deprecate-comparable-mixin',
    since: Object.freeze({ available: '7.2.0', enabled: '7.2.0' }),
    until: '7.5.0',
  }),
  DEPRECATE_IMPORT_INJECT: Object.freeze({
    id: 'importing-inject-from-ember-service',
    since: Object.freeze({ available: '6.2.0', enabled: '6.3.0' }),
    until: '7.0.0',
  }),
});

const DEFAULT_FLAGS = Object.freeze(
  Object.fromEntries(Object.keys(FLAGS).map((name) => [name, true]))
);

function resolveFlags(overrides = {}) {
  for (let [name, value] of Object.entries(overrides)) {
    if (!(name in DEFAULT_FLAGS)) {
      throw new Error(
        `Unknown deprecation flag: ${name}. Valid flags: ${Object.keys(DEFAULT_FLAGS).join(', ')}`
      );
    }
    if (typeof value !== 'boolean') {
      throw new Error(`Deprecation flag ${name} must be a boolean, got: ${value}`);
    }
  }
  return { ...DEFAULT_FLAGS, ...overrides };
}

// Parses EMBER_DEPRECATION_FLAGS, e.g.
// "DEPRECATE_COMPARABLE_MIXIN=false,DEPRECATE_IMPORT_INJECT=false", with
// "all=false" as shorthand for disabling every flag.
function parseFlagsFromEnv(value) {
  let overrides = {};
  for (let entry of value.split(',')) {
    let trimmed = entry.trim();
    if (trimmed === '') continue;
    let match = /^(\w+)=(true|false)$/.exec(trimmed);
    if (!match) {
      throw new Error(
        `Cannot parse EMBER_DEPRECATION_FLAGS entry: "${trimmed}" (expected NAME=true or NAME=false)`
      );
    }
    if (match[1] === 'all') {
      for (let name of Object.keys(DEFAULT_FLAGS)) {
        overrides[name] = match[2] === 'true';
      }
    } else {
      overrides[match[1]] = match[2] === 'true';
    }
  }
  return resolveFlags(overrides);
}

// babel-plugin-debug-macros tuple that folds @ember/deprecated-features
// imports to boolean literals. Only used for shaken variant builds; the
// standard dist keeps the imports live (externalized) so apps can shake.
function deprecatedFeatures(flags = DEFAULT_FLAGS) {
  return [
    require.resolve('babel-plugin-debug-macros'),
    {
      flags: [
        {
          source: '@ember/deprecated-features',
          flags: { ...flags },
        },
      ],
    },
    'debug-macros:deprecated-features',
  ];
}

module.exports = deprecatedFeatures;
module.exports.FLAGS = FLAGS;
module.exports.DEFAULT_FLAGS = DEFAULT_FLAGS;
module.exports.resolveFlags = resolveFlags;
module.exports.parseFlagsFromEnv = parseFlagsFromEnv;
