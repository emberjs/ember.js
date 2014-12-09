/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core";
import Cache from "ember-metal/cache";
import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import HandlebarsCompatibleHelper from "ember-htmlbars/compat/helper";

export var ISNT_HELPER_CACHE = new Cache(1000, function(key) {
  return key.indexOf('-') === -1;
});

/**
  Used to lookup/resolve handlebars helpers. The lookup order is:

  * Look for a registered helper
  * If a dash exists in the name:
    * Look for a helper registed in the container
    * Use Ember.ComponentLookup to find an Ember.Component that resolves
      to the given name

  @private
  @method resolveHelper
  @param {Container} container
  @param {String} name the name of the helper to lookup
  @return {Handlebars Helper}
*/
export default function lookupHelper(name, view, env) {
  if (env.helpers[name]) {
    return env.helpers[name];
  }

  var container = view.container;

  if (!container || ISNT_HELPER_CACHE.get(name)) {
    return;
  }

  var helperName = 'helper:' + name;
  var helper = container.lookup(helperName);
  if (!helper) {
    var componentLookup = container.lookup('component-lookup:main');
    Ember.assert("Could not find 'component-lookup:main' on the provided container," +
                 " which is necessary for performing component lookups", componentLookup);

    var Component = componentLookup.lookupFactory(name, container);
    if (Component) {
      helper = makeViewHelper(Component);
      container.register(helperName, helper);
    }
  }

  if (helper && !helper.isHTMLBars) {
    helper = new HandlebarsCompatibleHelper(helper);
    container.unregister(helperName);
    container.register(helperName, helper);
  }

  return helper;
}
