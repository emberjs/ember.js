/**
@module ember
@submodule ember-htmlbars
*/

import Ember from 'ember-metal/core';
import Cache from 'ember-metal/cache';
import HandlebarsCompatibleHelper from 'ember-htmlbars/compat/helper';

export var CONTAINS_DASH_CACHE = new Cache(1000, function(key) {
  return key.indexOf('-') !== -1;
});

export function validateLazyHelperName(helperName, container, keywords, knownHelpers) {
  if (!container || (helperName in keywords)) {
    return false;
  }

  if (knownHelpers[helperName] || CONTAINS_DASH_CACHE.get(helperName)) {
    return true;
  }
}

function isLegacyBareHelper(helper) {
  return helper && (!helper.isHelperFactory && !helper.isHelperInstance && !helper.isHTMLBars);
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
    if (validateLazyHelperName(name, container, env.hooks.keywords, env.knownHelpers)) {
      var helperName = 'helper:' + name;
      if (container.registry.has(helperName)) {
        helper = container.lookupFactory(helperName);
        if (isLegacyBareHelper(helper)) {
          Ember.deprecate(`The helper "${name}" is a deprecated bare function helper. Please use Ember.Helper.build to wrap helper functions.`, false, { id: 'ember-htmlbars.legacy-bare-helper', until: '3.0.0' });
          helper = new HandlebarsCompatibleHelper(helper);
        }
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
