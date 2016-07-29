import require from 'require';

export default function pickCompiler() {
  let compiler;
  if (require.has('glimmer-compiler')) {
    compiler = require('ember-glimmer-template-compiler');
  } else {
    compiler = require('ember-htmlbars-template-compiler');
  }

  return compiler;
}
