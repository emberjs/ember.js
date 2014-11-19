import Ember from "ember-metal/core";
import Cache from "ember-metal/cache";
import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import HandlebarsCompatibleHelper from "ember-htmlbars/compat/helper";
import Stream from "ember-metal/streams/stream";
import {readArray} from "ember-metal/streams/read";
import Helper from "ember-htmlbars/system/helper";

export var ISNT_HELPER_CACHE = new Cache(1000, function(key) {
  return key.indexOf('-') === -1;
});

export function attribute(params, hash, options, env) {
  var dom = env.dom;
  var name = params[0];
  var value = params[1];

  value.subscribe(function(lazyValue) {
    dom.setAttribute(options.element, name, lazyValue.value());
  });

  dom.setAttribute(options.element, name, value.value());
}

var attributeHelper = new Helper(attribute);

export function concat(params, hash, options, env) {
  var stream = new Stream(function() {
    return readArray(params).join('');
  });

  for (var i = 0, l = params.length; i < l; i++) {
    var param = params[i];

    if (param && param.isStream) {
      param.subscribe(stream.notifyAll, stream);
    }
  }

  return stream;
}

var concatHelper = new Helper(concat);

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
export function lookupHelper(name, view, env) {
  if (name === 'concat') {
    return concatHelper;
  }

  if (name === 'attribute') {
    return attributeHelper;
  }

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
