/**
@module ember
@submodule ember-template-compiler
*/

import isEnabled from 'ember-metal/features';
import require, { has } from 'require';
import compileOptions from 'ember-template-compiler/system/compile_options';
import template from 'ember-template-compiler/system/template';

var compile;

/**
  Uses HTMLBars `compile` function to process a string into a compiled template.

  This is not present in production builds.

  @private
  @method compile
  @param {String} templateString This is the string to be compiled by HTMLBars.
  @param {Object} options This is an options hash to augment the compiler options.
*/
export default function(templateString, options) {
  if (isEnabled('ember-glimmer')) {
    if (!compile && has('glimmer-compiler')) {
      compile = require('glimmer-compiler').compileSpec;
    }

    if (!compile) {
      throw new Error('Cannot call `compile` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compile`.');
    }

    return template(compile(templateString, options));
  } else {
    if (!compile && has('htmlbars-compiler/compiler')) {
      compile = require('htmlbars-compiler/compiler').compile;
    }

    if (!compile) {
      throw new Error('Cannot call `compile` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compile`.');
    }

    var templateSpec = compile(templateString, compileOptions(options));

    return template(templateSpec);
  }
}
