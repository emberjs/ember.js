/**
@module ember
@submodule ember-template-compiler
*/
import require, { has } from 'require';
import isEnabled from 'ember-metal/features';


var compile, compileSpec, compileOptions;

// Note we don't really want to expose this from main file
if (isEnabled('ember-glimmer')) {
  compileOptions = require('ember-glimmer-template-compiler/system/compile-options').default;
} else {
  compileOptions = require('ember-htmlbars-template-compiler/system/compile-options').default;
}

export default function(string) {
  if ((!compile || !compileSpec) && has('htmlbars-compiler/compiler')) {
    var Compiler = require('htmlbars-compiler/compiler');

    compile = Compiler.compile;
    compileSpec = Compiler.compileSpec;
  }

  if (!compile || !compileSpec) {
    throw new Error('Cannot call `precompile` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `precompile`.');
  }

  var asObject = arguments[1] === undefined ? true : arguments[1];
  var compileFunc = asObject ? compile : compileSpec;

  return compileFunc(string, compileOptions());
}
