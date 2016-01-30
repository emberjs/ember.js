import template from './template';
import require, { has } from 'require';

let compileSpec;
let Template;

export default function compile(string, options) {
  if (!compileSpec && has('glimmer-compiler')) {
    compileSpec = require('glimmer-compiler').compileSpec;
  }

  if (!Template && has('glimmer-runtime')) {
    Template = require('glimmer-runtime').Template;
  }

  if (!compileSpec || !Template) {
    throw new Error('Cannot call `compile` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compile`.');
  }

  let templateSpec = template(compileSpec(string, options));
  return Template.fromSpec(templateSpec, options.env);
}
