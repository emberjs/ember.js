import require, { has } from 'require';
import template from './template';
import compileOptions from './compile-options';

let compile;

export default function compiler(string, options) {
  if (!compile && has('htmlbars-compiler/compiler')) {
    compile = require('htmlbars-compiler/compiler').compile;
  }

  if (!compile) {
    throw new Error('Cannot call `compile` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compile`.');
  }

  let templateSpec = compile(string, compileOptions(options));

  return template(templateSpec);
}
