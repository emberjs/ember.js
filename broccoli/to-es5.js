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
  options.sourceMap = true;
  options.plugins = [
    injectBabelHelpers,
    ['module-resolver', { resolvePath: resolveModuleSource }],
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
    ['@babel/transform-template-literals', { loose: true }],
    ['@babel/transform-arrow-functions'],
    ['@babel/transform-destructuring', { loose: true }],
    ['@babel/transform-spread', { loose: true }],
    ['@babel/transform-parameters'],
    ['@babel/transform-computed-properties', { loose: true }],
    ['@babel/transform-shorthand-properties'],
    ['@babel/transform-block-scoping', { throwIfClosureRequired: true }],
    ['@babel/transform-classes', { loose: true }],
    ['@babel/transform-proto-to-assign'],
    injectNodeGlobals,
    ['@babel/transform-modules-amd', { noInterop: true, strict: true }],
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
