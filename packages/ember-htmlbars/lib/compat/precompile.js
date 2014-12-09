/**
@module ember
@submodule ember-htmlbars
*/

import { compile, compileSpec } from "htmlbars-compiler/compiler";

export default function(string) {
  var asObject = arguments[1] === undefined ? true : arguments[1];
  var compileFunc = asObject ? compile : compileSpec;

  return compileFunc(string);
}
