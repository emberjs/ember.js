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
        source: '@glimmer/util'
      },
      externalizeHelpers: {
        module: true
      }
    }])

    glimmerUtils.push([nuke, { source: '@glimmer/debug' }]);
    glimmerUtils.push([nuke, { source: '@glimmer/vm/lib/-debug-strip' }]);
    glimmerUtils.push([nuke, {
      source: '@glimmer/vm',
      delegate: removeMetaData
    }]);
    glimmerUtils.push([nuke, {
      source: '@glimmer/opcode-compiler',
      delegate: removeLogging
    }]);
  }

  return babel(jsTree, {
    annotation: 'Babel - Strip Glimmer Utilities',
    sourceMaps: 'inline',
    moduleIds: true,
    getModuleId: nameResolver,
    plugins: [
      ...glimmerUtils,
      [stripGlimmerUtils, { bindings: ['expect', 'unwrap'], source: '@glimmer/util' }]
    ]
  });
}

function removeMetaData(bindingName, path, t) {
  if (bindingName === 'METADATA') {
    path.parentPath.replaceWith(t.nullLiteral());
  }
}

function removeLogging(bindingName, path, t) {
  if (bindingName === 'debugSlice') {
    path.parentPath.remove();
  }

  if (bindingName === 'debug') {
    path.parentPath.replaceWith(t.arrayExpression());
  }

  if (bindingName === 'logOpcode') {
    path.parentPath.replaceWith(t.stringLiteral(''));
  }
}

removeLogging.baseDir = nuke.baseDir;
removeMetaData.baseDir = nuke.baseDir;
