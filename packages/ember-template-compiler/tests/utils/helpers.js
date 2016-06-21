import isEnabled from 'ember-metal/features';
import require from 'require';

export function compile(string, options) {
  let compiler;
  if (isEnabled('ember-glimmer')) {
    compiler = require('ember-glimmer-template-compiler/tests/utils/helpers').compile;
  } else {
    compiler = require('ember-htmlbars-template-compiler/tests/utils/helpers').compile;
  }

  return compiler(string, options);
}
