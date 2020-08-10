/**
@module ember
*/
import require, { has } from 'require';
import { CompileOptions } from '../types';
import precompile from './precompile';

// FIXME
type StaticTemplate = unknown;
type Factory = any;

let template: (templateJS: StaticTemplate) => Factory;

/**
  Uses HTMLBars `compile` function to process a string into a compiled template.

  This is not present in production builds.

  @private
  @method compile
  @param {String} templateString This is the string to be compiled by HTMLBars.
  @param {Object} options This is an options hash to augment the compiler options.
*/
export default function compile(templateString: string, options: CompileOptions = {}): Factory {
  if (!template && has('@ember/-internals/glimmer')) {
    // tslint:disable-next-line:no-require-imports
    template = require('@ember/-internals/glimmer').template;
  }

  if (!template) {
    throw new Error(
      'Cannot call `compile` with only the template compiler loaded. Please load `ember.debug.js` or `ember.prod.js` prior to calling `compile`.'
    );
  }

  return template(evaluate(precompile(templateString, options)));
}

function evaluate(precompiled: string): StaticTemplate {
  return new Function(`return ${precompiled}`)();
}
