import require, { has } from 'require';
import compileOptions from './compile-options';

let compileSpec, template;

export default function compile(string, options) {
  if (!compileSpec && has('glimmer-compiler')) {
    compileSpec = require('glimmer-compiler').compileSpec;
  }

  if (!template && has('ember-glimmer')) {
    template = require('ember-glimmer').template;
  }

  if (!compileSpec) {
    throw new Error('Cannot call `compile` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compile`.');
  }

  if (!template) {
    throw new Error('Cannot call `compile` with only the template compiler loaded. Please load `ember.debug.js` or `ember.prod.js` prior to calling `compile`.');
  }

  return template(compileSpec(string, compileOptions(options)));
}
