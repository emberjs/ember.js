import assign from 'ember-metal/assign';
import { defaultCompileOptions } from 'ember-template-compiler';
import isEnabled from 'ember-metal/features';
import require from 'require';

export function compile(string, options) {
  options = assign({}, defaultCompileOptions(), options);
  let compiler;
  if (isEnabled('ember-glimmer')) {
    compiler = require('ember-glimmer-template-compiler').compile;
  } else {
    compiler = require('ember-htmlbars-template-compiler').compile;
  }

  return compiler(string, options);
}
