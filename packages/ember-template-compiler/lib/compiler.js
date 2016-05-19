import isEnabled from 'ember-metal/features';
import require from 'require';

export default function pickCompiler() {
  let compiler;
  if (isEnabled('ember-glimmer')) {
    compiler = require('ember-glimmer-template-compiler');
  } else {
    compiler = require('ember-htmlbars-template-compiler');
  }

  return compiler;
}
