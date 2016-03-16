/**
@module ember
@submodule ember-template-compiler
*/

import isEnabled from 'ember-metal/features';
import require, { has } from 'require';
import compileOptions from 'ember-template-compiler/system/compile_options';

var compileSpec;

/**
  Uses HTMLBars `compile` function to process a string into a compiled template string.
  The returned string must be passed through `Ember.HTMLBars.template`.

  This is not present in production builds.

  @private
  @method precompile
  @param {String} templateString This is the string to be compiled by HTMLBars.
*/
export default function(templateString, options) {
  if (isEnabled('ember-glimmer')) {
    if (!compileSpec && has('glimmer-compiler')) {
      compileSpec = require('glimmer-compiler').compileSpec;
    }

    if (!compileSpec) {
      throw new Error('Cannot call `compile` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compile`.');
    }

    return JSON.stringify(compileSpec(templateString, options));
  } else {
    if (!compileSpec && has('htmlbars-compiler/compiler')) {
      compileSpec = require('htmlbars-compiler/compiler').compileSpec;
    }

    if (!compileSpec) {
      throw new Error('Cannot call `compileSpec` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compileSpec`.');
    }

    return compileSpec(templateString, compileOptions(options));
  }
}
