import { DEBUG } from '@glimmer/env';

export { compile as compileTemplate } from 'ember-template-compiler';

export let precompileTemplate;

if (DEBUG) {
  precompileTemplate = () => {
    throw new Error(
      'Attempted to call `precompileTemplate` at runtime, but this API is meant to be used at compile time. You should use `compileTemplate` instead.'
    );
  };
}
