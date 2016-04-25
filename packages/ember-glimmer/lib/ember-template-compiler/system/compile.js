import template from './template';
import require, { has } from 'require';
import TransformOldBindingSyntax from 'ember-template-compiler/plugins/transform-old-binding-syntax';
import TransformHasBlockSyntax from '../plugins/transform-has-block-syntax';

const DEFAULT_PLUGINS = {
  ast: [TransformOldBindingSyntax, TransformHasBlockSyntax]
};

let compileSpec;

export default function compile(string, options) {
  if (!compileSpec && has('glimmer-compiler')) {
    compileSpec = require('glimmer-compiler').compileSpec;
  }

  if (!compileSpec) {
    throw new Error('Cannot call `compile` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compile`.');
  }

  return template(compileSpec(string, compileOptions(options)));
}

function compileOptions(options) {
  options = options || {};
  if (!options.plugins) {
    options.plugins = DEFAULT_PLUGINS;
  } else {
    Object.keys(DEFAULT_PLUGINS).forEach((typeKey) => {
      options.plugins[typeKey] = options.plugins[typeKey] || [];
      options.plugins[typeKey] = options.plugins[typeKey].concat(DEFAULT_PLUGINS[typeKey]);
    });
  }

  return options;
}
