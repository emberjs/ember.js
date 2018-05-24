'use strict';

const Babel = require('broccoli-babel-transpiler');
const injectBabelHelpers = require('./transforms/inject-babel-helpers');
const injectNodeGlobals = require('./transforms/inject-node-globals');
const enifed = require('./transforms/transform-define');
const FEATURES = require('./features');
const stripClassCallCheck = require('./transforms/strip-class-call-check');
const resolveModuleSource = require('amd-name-resolver').moduleResolve;

module.exports = function toES5(tree, _options) {
  let options = Object.assign(
    {
      environment: 'developement',
    },
    _options
  );

  let isDebug = options.environment !== 'production';

  options.moduleIds = true;
  options.resolveModuleSource = resolveModuleSource;
  options.sourceMap = true;
  options.plugins = [
    injectBabelHelpers,
    [
      'debug-macros',
      {
        debugTools: {
          source: '@ember/debug',
          assertPredicateIndex: 1,
          isDebug,
        },
        externalizeHelpers: {
          module: true,
        },
        flags: [
          { source: '@glimmer/env', flags: { DEBUG: isDebug } },
          {
            source: '@ember/canary-features',
            flags: Object.assign(
              // explicit list of additional exports within @ember/canary-features
              // without adding this (with a null value) an error is thrown during
              // the feature replacement process (e.g. XYZ is not a supported flag)
              {
                FEATURES: null,
                DEFAULT_FEATURES: null,
                isEnabled: null,
              },
              FEATURES
            ),
          },
        ],
      },
    ],
    ['transform-es2015-template-literals', { loose: true }],
    ['transform-es2015-literals'],
    ['transform-es2015-arrow-functions'],
    ['transform-es2015-destructuring', { loose: true }],
    ['transform-es2015-spread', { loose: true }],
    ['transform-es2015-parameters'],
    ['transform-es2015-computed-properties', { loose: true }],
    ['transform-es2015-shorthand-properties'],
    ['transform-es2015-block-scoping', { throwIfClosureRequired: true }],
    ['check-es2015-constants'],
    ['transform-es2015-classes', { loose: true }],
    ['transform-object-assign'],
    injectNodeGlobals,
    ['transform-es2015-modules-amd', { noInterop: true, strict: true }],
    enifed,
  ];

  if (options.transformDefine) {
    options.plugins = [enifed];
    delete options.transformDefine;
  }

  if (options.transformModules === false) {
    options.plugins.pop();
    options.plugins.pop();
    delete options.moduleIds;
    delete options.resolveModuleSource;
    delete options.transformModules;
  }

  if (options.inlineHelpers) {
    options.plugins.shift();
    delete options.inlineHelpers;
  }

  delete options.environment;

  return new Babel(tree, options);
};

function stripForProd(tree) {
  let options = {
    plugins: [
      [stripClassCallCheck, { source: 'ember-babel' }],
      ['minify-dead-code-elimination', { optimizeRawSize: true }],
    ],
  };

  return new Babel(tree, options);
}

module.exports.stripForProd = stripForProd;
