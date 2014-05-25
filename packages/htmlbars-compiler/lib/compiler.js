/*jshint evil:true*/
import { preprocess } from "./parser";
import { TemplateCompiler } from "./compiler/template";
import { domHelpers } from "htmlbars-runtime/dom_helpers";
import { Morph } from "morph";

export function compile(string, options) {
  return compileSpec(string, options)(domHelpers(), Morph);
}

export function compileSpec(string, options) {
  var ast = preprocess(string, options);
  var compiler = new TemplateCompiler();
  var program = compiler.compile(ast);
  return new Function("dom", "Morph", "return " + program);
}
