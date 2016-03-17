/**
@module ember
@submodule ember-htmlbars
*/

import { assert } from 'ember-metal/debug';
import Cache from 'ember-metal/cache';

export var CONTAINS_DASH_CACHE = new Cache(1000, function(key) {
  return key.indexOf('-') !== -1;
});

export var CONTAINS_DOT_CACHE = new Cache(1000, function(key) {
  return key.indexOf('.') !== -1;
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
function _findHelper(name, view, env, options) {
  var helper = env.helpers[name];

  if (!helper) {
    let owner = env.owner;
    if (validateLazyHelperName(name, owner, env.hooks.keywords)) {
      var helperName = 'helper:' + name;
      // See https://github.com/emberjs/ember.js/issues/13071
      // See https://bugs.chromium.org/p/v8/issues/detail?id=4839
      var registered = owner.hasRegistration(helperName, options);
      if (registered) {
        helper = owner._lookupFactory(helperName, options);
        assert(`Expected to find an Ember.Helper with the name ${helperName}, but found an object of type ${typeof helper} instead.`, helper.isHelperFactory || helper.isHelperInstance);
      }
    }
  }

  return helper;
}

export function findHelper(name, view, env) {
  let options = {};
  let moduleName = env.meta && env.meta.moduleName;
  if (moduleName) {
    options.source = `template:${moduleName}`;
  }

  let localHelper = _findHelper(name, view, env, options);

  // local match found, use it
  if (localHelper) {
    return localHelper;
  }

  // fallback to global
  return _findHelper(name, view, env);
}

export default function lookupHelper(name, view, env) {
  let helper = findHelper(name, view, env);

  assert(`A helper named '${name}' could not be found`, !!helper);

  return helper;
}
