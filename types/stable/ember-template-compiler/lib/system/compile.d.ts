declare module 'ember-template-compiler/lib/system/compile' {
  /**
    @module ember
    */
  import type { EmberPrecompileOptions } from 'ember-template-compiler/lib/types';
  import type { TemplateFactory } from '@glimmer/interfaces';
  /**
      Uses HTMLBars `compile` function to process a string into a compiled template.
      This is not present in production builds.
      @private
      @method compile
      @param {String} templateString This is the string to be compiled by HTMLBars.
      @param {Object} options This is an options hash to augment the compiler options.
    */
  export default function compile(
    templateString: string,
    options?: Partial<EmberPrecompileOptions>
  ): TemplateFactory;
}
