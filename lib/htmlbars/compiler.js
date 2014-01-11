/*jshint evil:true*/
import { preprocess } from "htmlbars/parser";
import { TemplateCompiler } from "htmlbars/compiler/template";
import { domHelpers } from "htmlbars/runtime/dom_helpers";
import { Range } from "htmlbars/runtime/range";

export function compile(string, options) {
  return compileSpec(string, options)(domHelpers(), Range);
}

export function compileSpec(string, options) {
  var ast = preprocess(string, options);
  var compiler = new TemplateCompiler();
  var program = compiler.compile(ast);
  return new Function("dom", "Range", "return " + program);
}
