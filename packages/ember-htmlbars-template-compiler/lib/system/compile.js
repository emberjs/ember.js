import require, { has } from 'require';
import compileOptions from './compile-options';

let compile, template;

export default function compiler(string, options) {
  if (!template && has('ember-htmlbars')) {
    template = require('ember-htmlbars').template;
  }

  if (!compile && has('htmlbars-compiler/compiler')) {
    compile = require('htmlbars-compiler/compiler').compile;
  }

  if (!compile) {
    throw new Error('Cannot call `compile` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compile`.');
  }

  if (!template) {
    throw new Error('Cannot call `compile` with only the template compiler loaded. Please load `ember.debug.js` or `ember.prod.js` prior to calling `compile`.');
  }

  let templateSpec = compile(string, compileOptions(options));

  return template(templateSpec);
}
