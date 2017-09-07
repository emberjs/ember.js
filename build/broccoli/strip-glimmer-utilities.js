'use strict';

const babel = require('broccoli-babel-transpiler');
const stripGlimmerUtils = require('babel-plugin-strip-glimmer-utils');
const debugMacros = require('babel-plugin-debug-macros').default;
const nuke = require('babel-plugin-nukable-import');
const nameResolver = require('amd-name-resolver').moduleResolve;

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
          DEBUG: process.env.EMBER_ENV !== 'production',
          DEVMODE: process.env.EMBER_ENV !== 'production'
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

  function removeMetaData(bindingName, path, t) {
    if (bindingName === 'METADATA') {
      path.parentPath.replaceWith(t.nullLiteral());
    }
  }

  removeMetaData.baseDir = nuke.baseDir;

  return babel(jsTree, {
    annotation: 'Babel - Strip Glimmer Utilities',
    sourceMaps: 'inline',
    moduleIds: true,
    getModuleId: nameResolver,
    plugins: [
      ...glimmerUtils,
      [nuke, { source: '@glimmer/debug' }],
      [nuke, { source: '@glimmer/vm/lib/-debug-strip' }],
      [nuke, {
        source: '@glimmer/vm',
        delegate: removeMetaData
      }],
      [stripGlimmerUtils, { bindings: ['expect', 'unwrap'], source: '@glimmer/util' }]
    ]
  });
}
