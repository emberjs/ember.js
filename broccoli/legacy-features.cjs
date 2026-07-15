'use strict';

const DEFAULT_FLAGS = Object.freeze({
  CLASSIC_OBJECT_MODEL: true,
  CLASSIC_COMPONENTS: true,
  CONTROLLER_QUERY_PARAMS: true,
});

// Sections that cannot outlive a section they are built on.
const REQUIRES = {
  // classic components extend EmberObject
  CLASSIC_COMPONENTS: ['CLASSIC_OBJECT_MODEL'],
};

function resolveFlags(overrides = {}) {
  for (let name of Object.keys(overrides)) {
    if (!(name in DEFAULT_FLAGS)) {
      throw new Error(
        `Unknown legacy feature flag: ${name}. Valid flags: ${Object.keys(DEFAULT_FLAGS).join(
          ', '
        )}`
      );
    }
    if (typeof overrides[name] !== 'boolean') {
      throw new Error(`Legacy feature flag ${name} must be a boolean`);
    }
  }

  let flags = { ...DEFAULT_FLAGS, ...overrides };

  for (let [name, requirements] of Object.entries(REQUIRES)) {
    for (let requirement of requirements) {
      if (flags[name] && !flags[requirement]) {
        throw new Error(`Invalid legacy feature flag combination: ${name} requires ${requirement}`);
      }
    }
  }

  return flags;
}

// Parses `EMBER_LEGACY_FLAGS="CLASSIC_COMPONENTS=false,CONTROLLER_QUERY_PARAMS=true"`
function parseFlagsFromEnv(value) {
  let overrides = {};
  for (let entry of value.split(',')) {
    entry = entry.trim();
    if (entry === '') continue;
    let [name, raw] = entry.split('=');
    if (raw !== 'true' && raw !== 'false') {
      throw new Error(`EMBER_LEGACY_FLAGS entries must be NAME=true or NAME=false, got: ${entry}`);
    }
    overrides[name] = raw === 'true';
  }
  return resolveFlags(overrides);
}

module.exports = function legacyFeatures(flags = DEFAULT_FLAGS) {
  return [
    require.resolve('babel-plugin-debug-macros'),
    {
      flags: [
        {
          source: '@ember/legacy-features',
          flags: { ...flags },
        },
      ],
    },
    'debug-macros:legacy-flags',
  ];
};

module.exports.DEFAULT_FLAGS = DEFAULT_FLAGS;
module.exports.resolveFlags = resolveFlags;
module.exports.parseFlagsFromEnv = parseFlagsFromEnv;
