/**
@module ember
@submodule ember-templates
*/

import { assert } from 'ember-metal/debug';
import { internal } from 'htmlbars-runtime';

export default {
  isStable() {
    return true;
  },

  isEmpty(state) {
    return false;
  },

  render(morph, env, scope, params, hash, template, inverse, visitor) {
    assert(
      '{{#with foo}} must be called with a single argument or the use the ' +
      '{{#with foo as |bar|}} syntax',
      params.length === 1
    );

    assert(
      'The {{#with}} helper must be called with a block',
      !!template
    );

    internal.continueBlock(morph, env, scope, 'with', params, hash, template, inverse, visitor);
  },

  rerender(morph, env, scope, params, hash, template, inverse, visitor) {
    internal.continueBlock(morph, env, scope, 'with', params, hash, template, inverse, visitor);
  }
};
