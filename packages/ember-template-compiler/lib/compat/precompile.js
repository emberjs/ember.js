/**
@module ember
@submodule ember-template-compiler
*/
import Ember from 'ember-metal/core';
import compileOptions from 'ember-template-compiler/system/compile_options';

var compile, compileSpec;

export default function(string) {
  if ((!compile || !compileSpec) && Ember.__loader.registry['htmlbars-compiler/compiler']) {
    var Compiler = requireModule('htmlbars-compiler/compiler');

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
