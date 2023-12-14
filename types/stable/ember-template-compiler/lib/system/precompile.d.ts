declare module 'ember-template-compiler/lib/system/precompile' {
  /**
    @module ember
    */
  import type { EmberPrecompileOptions } from 'ember-template-compiler/lib/types';
  /**
      Uses HTMLBars `compile` function to process a string into a compiled template string.
      The returned string must be passed through `Ember.HTMLBars.template`.

      This is not present in production builds.

      @private
      @method precompile
      @param {String} templateString This is the string to be compiled by HTMLBars.
    */
  export default function precompile(
    templateString: string,
    options?: Partial<EmberPrecompileOptions>
  ): string;
}
