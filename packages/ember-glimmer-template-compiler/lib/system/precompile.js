import compileOptions from './compile-options';
import require, { has } from 'require';
let compileSpec;

export default function precompile(templateString, options) {
  if (!compileSpec && has('glimmer-compiler')) {
    compileSpec = require('glimmer-compiler').compileSpec;
  }

  if (!compileSpec) {
    throw new Error('Cannot call `compile` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compile`.');
  }

  return JSON.stringify(compileSpec(templateString, compileOptions(options)));
}

