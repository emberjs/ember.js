/*jshint evil:true*/
import { preprocess } from "./parser";
import { TemplateCompiler } from "./compiler/template";

/*
 * Compile a string into a template rendering function
 *
 * Example usage:
 *
 *     // Template is the hydration portion of the compiled template
 *     var template = compile("Howdy {{name}}");
 *
 *     // Template accepts two arguments:
 *     //
 *     //   1. A context object
 *     //   2. An env object
 *     //
 *     // The env object *must* have at least these two properties:
 *     //
 *     //   1. `hooks` - Basic hooks for rendering a template
 *     //   2. `dom` - An instance of DOMHelper that provides the context for DOM creation
 *     //
 *     import {hooks} from 'htmlbars-runtime';
 *     import {DOMHelper} from 'morph';
 *     var domFragment = template({name: 'whatever'}, {hooks: hooks, dom: new DOMHelper() });
 *
 * @method compile
 * @param {String} string An htmlbars template string
 * @return {Function} A function for rendering the template
 */
export function compile(string) {
  var program = compileSpec(string);
  return new Function("return " + program)();
}

/*
 * Compile a string into a template spec string. The template spec is a string
 * representation of a template. Usually, you would use compileSpec for
 * pre-compilation of a template on the server.
 *
 * Example usage:
 *
 *     var templateSpec = compileSpec("Howdy {{name}}");
 *     // This next step is basically what plain compile does
 *     var template = new Function("return " + templateSpec)();
 *
 * @method compileSpec
 * @param {String} string An htmlbars template string
 * @return {Function} A template spec string
 */
export function compileSpec(string) {
  var ast = preprocess(string);
  var compiler = new TemplateCompiler();
  var program = compiler.compile(ast);
  return program;
}
