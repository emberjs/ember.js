import { wrap } from 'htmlbars-runtime/hooks';

/**
@module ember
@submodule ember-template-compiler
*/

/**
  Augments the default precompiled output of an HTMLBars template with
  additional information needed by Ember.

  @private
  @method template
  @param {Function} templateSpec This is the compiled HTMLBars template spec.
*/

export default function(templateSpec) {
  if (!templateSpec.render) {
    templateSpec = wrap(templateSpec);
  }

  templateSpec.isTop = true;
  templateSpec.isMethod = false;

  return templateSpec;
}
