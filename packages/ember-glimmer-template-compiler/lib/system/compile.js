import template from './template';
import require, { has } from 'require';
import compileOptions from './compile-options';

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
