/*jshint evil:true*/
import { preprocess } from "htmlbars/parser";
import { TemplateCompiler } from "htmlbars/compiler/template";
import { domHelpers } from "htmlbars/runtime/dom_helpers";
import { Placeholder } from "htmlbars/runtime/placeholder";

export function compile(string, options) {
  return compileSpec(string, options)(domHelpers(), Placeholder);
}

export function compileSpec(string, options) {
  var ast = preprocess(string, options);
  var compiler = new TemplateCompiler();
  var program = compiler.compile(ast);
  return new Function("dom", "Placeholder", "return " + program);
}
