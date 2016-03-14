import { preprocess } from "glimmer-syntax";
import TemplateCompiler from "./template-compiler";

export type TemplateSpec = string;

/*
 * Compile a string into a template spec string. The template spec is a string
 * representation of a template. Usually, you would use compileSpec for
 * pre-compilation of a template on the server.
 *
 * Example usage:
 *
 *     let templateSpec = compileSpec("Howdy {{name}}");
 *     // This next step is basically what plain compile does
 *     let template = new Function("return " + templateSpec)();
 *
 * @method compileSpec
 * @param {String} string An Glimmer template string
 * @return {TemplateSpec} A template spec string
 */
export function compileSpec(string: string, options: any): TemplateSpec {
  let ast = preprocess(string, options);
  let program = TemplateCompiler.compile(options, ast);
  return JSON.stringify(program);
}
