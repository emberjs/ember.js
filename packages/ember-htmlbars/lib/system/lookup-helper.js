/**
@module ember
@submodule ember-htmlbars
*/

import { assert } from 'ember-metal/debug';
import Cache from 'ember-metal/cache';

export var CONTAINS_DASH_CACHE = new Cache(1000, function(key) {
  return key.indexOf('-') !== -1;
});

export function validateLazyHelperName(helperName, container, keywords) {
  return container && !(helperName in keywords);
}

/**
  Used to lookup/resolve handlebars helpers. The lookup order is:

  * Look for a registered helper
  * If a dash exists in the name:
    * Look for a helper registed in the container
    * Use Ember.ComponentLookup to find an Ember.Component that resolves
      to the given name

  @private
  @method resolveHelper
  @param {String} name the name of the helper to lookup
  @return {Helper}
*/
export function findHelper(name, view, env) {
  var helper = env.helpers[name];

  if (!helper) {
    var container = env.container;
    if (validateLazyHelperName(name, container, env.hooks.keywords)) {
      var helperName = 'helper:' + name;
      if (container.registry.has(helperName)) {
        helper = container.lookupFactory(helperName);
        assert(`Expected to find an Ember.Helper with the name ${helperName}, but found an object of type ${typeof helper} instead.`, helper.isHelperFactory || helper.isHelperInstance);
      }
    }
  }

  return helper;
}

export default function lookupHelper(name, view, env) {
  let helper = findHelper(name, view, env);

  assert(`A helper named '${name}' could not be found`, !!helper);

  return helper;
}
