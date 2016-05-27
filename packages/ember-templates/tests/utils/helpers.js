import isEnabled from 'ember-metal/features';
import require from 'require';

/*
  Unlike HTMLBars, Glimmer doesn't have the concept of a global helpers hash,
  so we reuse the hash from HTMLBars (via symlink) in order to provide a dummy
  interface for tests when running them with Glimmer enabled.
*/
export default (function () {
  if (isEnabled('ember-glimmer')) {
    return require('ember-glimmer/tests/utils/global-helpers-hash').default;
  } else {
    return require('ember-htmlbars/helpers').default;
  }
}());

export const registerHelper = (function () {
  if (isEnabled('ember-glimmer')) {
    return require('ember-glimmer/tests/utils/register-helper').default;
  } else {
    return require('ember-htmlbars/helpers').registerHelper;
  }
}());
