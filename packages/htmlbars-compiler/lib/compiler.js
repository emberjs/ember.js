/*jshint evil:true*/
import { preprocess } from "./parser";
import { TemplateCompiler } from "./compiler/template";

export function compile(string, options) {
  return compileSpec(string, options)();
}

export function compileSpec(string, options) {
  var ast = preprocess(string, options);
  var compiler = new TemplateCompiler();
  var program = compiler.compile(ast);
  return new Function("return " + program);
}
