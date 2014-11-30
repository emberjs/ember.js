/**
@module ember
@submodule ember-htmlbars
*/

import isNone from 'ember-metal/is_none';
import run from "ember-metal/run_loop";
import { get } from "ember-metal/property_get";
import SimpleStream from "ember-metal/streams/simple";
import BoundView from "ember-views/views/bound_view";
import { appendSimpleBoundView } from "ember-views/views/simple_bound_view";

function exists(value) {
  return !isNone(value);
}

// Binds a property into the DOM. This will create a hook in DOM that the
// KVO system will look for and update if the property changes.
function bind(property, hash, options, env, preserveContext, shouldDisplay, valueNormalizer, childProperties, _viewClass) {
  var valueStream = property.isStream ? property : this.getStream(property);
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
    _morph: options.morph,
    preserveContext: preserveContext,
    shouldDisplayFunc: shouldDisplay,
    valueNormalizerFunc: valueNormalizer,
    displayTemplate: options.render,
    inverseTemplate: options.inverse,
    lazyValue: lazyValue,
    previousContext: get(this, 'context'),
    isEscaped: !hash.unescaped,
    templateHash: hash,
    helperName: options.helperName
  };

  if (options.keywords) {
    viewOptions._keywords = options.keywords;
  }

  // Create the view that will wrap the output of this template/property
  // and add it to the nearest view's childViews array.
  // See the documentation of Ember._BoundView for more.
  var bindView = this.createChildView(viewClass, viewOptions);

  this.appendChild(bindView);

  lazyValue.subscribe(this._wrapAsScheduled(function() {
    run.scheduleOnce('render', bindView, 'rerenderIfNeeded');
  }));
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
  @param {Function} render Context to provide for rendering
  @return {String} HTML string
*/
function bindHelper(params, hash, options, env) {
  Ember.assert("You must pass exactly one argument to the bind helper", params.length === 1);

  var property = params[0];

  if (typeof property === 'string') {
    property = this.getStream(property);
  }

  if (options.render) {
    options.helperName = 'bind';
    Ember.deprecate("The block form of bind, {{#bind foo}}{{/bind}}, has been deprecated and will be removed.");
    bind.call(this, property, hash, options, env, false, exists);
  } else {
    appendSimpleBoundView(this, options.morph, property);
  }
}

export {
  bind,
  bindHelper
};
