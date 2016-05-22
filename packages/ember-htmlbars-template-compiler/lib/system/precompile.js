import compileOptions from './compile-options';
import require, { has } from 'require';
let compileSpec;

export default function precompile(templateString, options) {
  if (!compileSpec && has('htmlbars-compiler/compiler')) {
    compileSpec = require('htmlbars-compiler/compiler').compileSpec;
  }

  if (!compileSpec) {
    throw new Error('Cannot call `compileSpec` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compileSpec`.');
  }

  return compileSpec(templateString, compileOptions(options));
}
