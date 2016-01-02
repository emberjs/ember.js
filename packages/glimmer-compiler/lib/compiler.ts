import { preprocess } from "glimmer-syntax";
import TemplateCompiler from "./template-compiler";
import { SerializedTemplate } from './types';
import { Environment, Template, RawLayout } from "glimmer-runtime";

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
 * @param {String} string An Glimmer template string
 * @return {TemplateSpec} A template spec string
 */
export function compileSpec(string, options): string {
  var ast = preprocess(string, options);
  var program = TemplateCompiler.compile(options, ast);
  return JSON.stringify(program);
}

/*
 * @method template
 * @param {TemplateSpec} templateSpec A precompiled template
 * @return {Template} A template spec string
 */
export function template(templateSpec): SerializedTemplate {
  return new Function("return " + templateSpec)();
}

interface CompileOptions {
  disableComponentGeneration?: boolean;
  env: Environment;
}

/*
 * Compile a string into a template rendering function
 *
 * Example usage:
 *
 *     // Template is the hydration portion of the compiled template
 *     var template = compile("Howdy {{name}}");
 *
 *     // Template accepts three arguments:
 *     //
 *     //   1. A context object
 *     //   2. An env object
 *     //   3. A contextualElement (optional, document.body is the default)
 *     //
 *     // The env object *must* have at least these two properties:
 *     //
 *     //   1. `hooks` - Basic hooks for rendering a template
 *     //   2. `dom` - An instance of DOMHelper
 *     //
 *     import {hooks} from 'glimmer-runtime';
 *     import {DOMHelper} from 'morph';
 *     var context = {name: 'whatever'},
 *         env = {hooks: hooks, dom: new DOMHelper()},
 *         contextualElement = document.body;
 *     var domFragment = template(context, env, contextualElement);
 *
 * @method compile
 * @param {String} string An Glimmer template string
 * @param {Object} options A set of options to provide to the compiler
 * @return {Template} A function for rendering the template
 */
export function compile(string: string, options: CompileOptions): Template {
  let templateSpec = template(compileSpec(string, options));
  return Template.fromSpec(templateSpec, options.env);
}

export function compileLayout(string: string, options: CompileOptions): RawLayout {
  let templateSpec = template(compileSpec(string, options));
  return Template.layoutFromSpec(templateSpec, options.env);
}