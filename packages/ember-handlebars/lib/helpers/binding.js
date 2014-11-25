/**
@module ember
@submodule ember-handlebars
*/

import Ember from "ember-metal/core"; // Ember.assert
import EmberHandlebars from "ember-handlebars-compiler";

import isNone from 'ember-metal/is_none';
import run from "ember-metal/run_loop";
import Cache from "ember-metal/cache";
import SimpleStream from "ember-metal/streams/simple";

import BoundView from "ember-views/views/bound_view";
import SimpleBoundView from "ember-views/views/simple_bound_view";

var helpers = EmberHandlebars.helpers;

function exists(value) {
  return !isNone(value);
}

// Binds a property into the DOM. This will create a hook in DOM that the
// KVO system will look for and update if the property changes.
function bind(property, options, preserveContext, shouldDisplay, valueNormalizer, childProperties, _viewClass) {
  var data = options.data;
  var view = data.view;

  // we relied on the behavior of calling without
  // context to mean this === window, but when running
  // "use strict", it's possible for this to === undefined;
  var currentContext = this || window;

  var valueStream = view.getStream(property);
  var lazyValue;

  if (childProperties) {
    lazyValue = new SimpleStream(valueStream);

    var subscriber = function(childStream) {
      childStream.value();
      lazyValue.notify();
    };

    for (var i = 0; i < childProperties.length; i++) {
      var childStream = valueStream.get(childProperties[i]);
      childStream.value();
      childStream.subscribe(subscriber);
    }
  } else {
    lazyValue = valueStream;
  }

  // Set up observers for observable objects
  var viewClass = _viewClass || BoundView;
  var viewOptions = {
    preserveContext: preserveContext,
    shouldDisplayFunc: shouldDisplay,
    valueNormalizerFunc: valueNormalizer,
    displayTemplate: options.fn,
    inverseTemplate: options.inverse,
    lazyValue: lazyValue,
    previousContext: currentContext,
    isEscaped: !options.hash.unescaped,
    templateHash: options.hash,
    helperName: options.helperName
  };

  if (options.keywords) {
    viewOptions._keywords = options.keywords;
  }

  // Create the view that will wrap the output of this template/property
  // and add it to the nearest view's childViews array.
  // See the documentation of Ember._BoundView for more.
  var bindView = view.createChildView(viewClass, viewOptions);

  view.appendChild(bindView);

  lazyValue.subscribe(view._wrapAsScheduled(function() {
    run.scheduleOnce('render', bindView, 'rerenderIfNeeded');
  }));
}

function simpleBind(currentContext, lazyValue, options) {
  var data = options.data;
  var view = data.view;

  var bindView = new SimpleBoundView(
    lazyValue, !options.hash.unescaped
  );

  bindView._parentView = view;
  view.appendChild(bindView);

  lazyValue.subscribe(view._wrapAsScheduled(function() {
    run.scheduleOnce('render', bindView, 'rerender');
  }));
}

/**
  '_triageMustache' is used internally select between a binding, helper, or component for
  the given context. Until this point, it would be hard to determine if the
  mustache is a property reference or a regular helper reference. This triage
  helper resolves that.

  This would not be typically invoked by directly.

  @private
  @method _triageMustache
  @for Ember.Handlebars.helpers
  @param {String} property Property/helperID to triage
  @param {Object} options hash of template/rendering options
  @return {String} HTML string
*/
function _triageMustacheHelper(property, options) {
  Ember.assert("You cannot pass more than one argument to the _triageMustache helper", arguments.length <= 2);

  var helper = EmberHandlebars.resolveHelper(options.data.view.container, property);
  if (helper) {
    return helper.call(this, options);
  }

  return helpers.bind.call(this, property, options);
}

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
function resolveHelper(container, name) {
  if (helpers[name]) {
    return helpers[name];
  }

  if (!container || ISNT_HELPER_CACHE.get(name)) {
    return;
  }

  var helper = container.lookup('helper:' + name);
  if (!helper) {
    var componentLookup = container.lookup('component-lookup:main');
    Ember.assert("Could not find 'component-lookup:main' on the provided container," +
                 " which is necessary for performing component lookups", componentLookup);

    var Component = componentLookup.lookupFactory(name, container);
    if (Component) {
      helper = EmberHandlebars.makeViewHelper(Component);
      container.register('helper:' + name, helper);
    }
  }
  return helper;
}


/**
  `bind` can be used to display a value, then update that value if it
  changes. For example, if you wanted to print the `title` property of
  `content`:

  ```handlebars
  {{bind "content.title"}}
  ```

  This will return the `title` property as a string, then create a new observer
  at the specified path. If it changes, it will update the value in DOM. Note
  that if you need to support IE7 and IE8 you must modify the model objects
  properties using `Ember.get()` and `Ember.set()` for this to work as it
  relies on Ember's KVO system. For all other browsers this will be handled for
  you automatically.

  @private
  @method bind
  @for Ember.Handlebars.helpers
  @param {String} property Property to bind
  @param {Function} fn Context to provide for rendering
  @return {String} HTML string
*/
function bindHelper(property, options) {
  Ember.assert("You cannot pass more than one argument to the bind helper", arguments.length <= 2);

  var context = (options.contexts && options.contexts.length) ? options.contexts[0] : this;

  if (!options.fn) {
    var lazyValue = options.data.view.getStream(property);
    return simpleBind(context, lazyValue, options);
  }

  options.helperName = 'bind';

  return bind.call(context, property, options, false, exists);
}

export {
  bind,
  _triageMustacheHelper,
  resolveHelper,
  bindHelper
};
