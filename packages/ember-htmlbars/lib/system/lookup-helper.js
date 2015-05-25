/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core";
import Cache from "ember-metal/cache";

export var CONTAINS_DASH_CACHE = new Cache(1000, function(key) {
  return key.indexOf('-') !== -1;
});

export function validateLazyHelperName(helperName, container, keywords) {
  return container && CONTAINS_DASH_CACHE.get(helperName) && !(helperName in keywords);
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
  @return {Handlebars Helper}
*/
export function findHelper(name, view, env) {
  var helper = env.helpers[name];

  if (!helper) {
    var container = env.container;
    if (validateLazyHelperName(name, container, env.hooks.keywords)) {
      var helperName = 'helper:' + name;
      if (container._registry.has(helperName)) {
        var _helper;
        Ember.assert(`The factory for "${name}" is not an Ember helper. Please use Ember.Helper.build to wrap helper functions.`, (_helper = container._registry.resolve(helperName)) && _helper && (_helper.isHelperFactory || _helper.isHelperInstance || _helper.isHTMLBars));
        helper = container.lookupFactory(helperName);
      }
    }
  }

  return helper;
}

export default function lookupHelper(name, view, env) {
  let helper = findHelper(name, view, env);

  Ember.assert(`A helper named '${name}' could not be found`, !!helper);

  return helper;
}
