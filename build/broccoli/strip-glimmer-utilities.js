'use strict';

const babel = require('broccoli-babel-transpiler');
const stripGlimmerUtils = require('babel-plugin-strip-glimmer-utils');
const debugMacros = require('babel-plugin-debug-macros').default;
const nuke = require('babel-plugin-nukable-import');

/**
 * Optimizes out Glimmer utility functions and strips debug code with a set of
 * Babel plugins.
 */
module.exports = function(jsTree) {
  let RETAIN_FLAGS = process.env.RETAIN_FLAGS;
  let glimmerUtils = [];
  if (!RETAIN_FLAGS) {
    glimmerUtils.push([debugMacros, {
      envFlags: {
        source: '@glimmer/local-debug-flags',
        flags: {
          DEBUG: process.env.EMBER_ENV !== 'production'
        }
      },
      debugTools: {
        source: '@glimmer/debug'
      },
      externalizeHelpers: {
        module: true
      }
    }])
  }

  return babel(jsTree, {
    annotation: 'Babel - Strip Glimmer Utilities',
    sourceMaps: 'inline',
    plugins: [
      ...glimmerUtils,
      [nuke, { source: '@glimmer/debug' }],
      [stripGlimmerUtils, { bindings: ['expect', 'unwrap'], source: '@glimmer/util' }]
    ]
  });
}
