// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-handlebars/ext');
require('ember-handlebars/views/bindable_span');
require('ember-handlebars/views/metamorph_view');

var get = Ember.get, getPath = Ember.Handlebars.getPath, set = Ember.set, fmt = Ember.String.fmt;
var forEach = Ember.ArrayUtils.forEach;

var EmberHandlebars = Ember.Handlebars, helpers = EmberHandlebars.helpers;

(function() {
  // Binds a property into the DOM. This will create a hook in DOM that the
  // KVO system will look for and update if the property changes.
  var bind = function(property, options, preserveContext, shouldDisplay, valueNormalizer) {
    var data = options.data,
        fn = options.fn,
        inverse = options.inverse,
        view = data.view,
        ctx  = this,
        normalized;

    normalized = Ember.Handlebars.normalizePath(ctx, property, data);

    ctx = normalized.root;
    property = normalized.path;

    // Set up observers for observable objects
    if ('object' === typeof this) {
      // Create the view that will wrap the output of this template/property
      // and add it to the nearest view's childViews array.
      // See the documentation of Ember._BindableSpanView for more.
      var bindView = view.createChildView(Ember._BindableSpanView, {
        preserveContext: preserveContext,
        shouldDisplayFunc: shouldDisplay,
        valueNormalizerFunc: valueNormalizer,
        displayTemplate: fn,
        inverseTemplate: inverse,
        property: property,
        previousContext: ctx,
        isEscaped: options.hash.escaped,
        templateData: options.data
      });

      view.appendChild(bindView);

      /** @private */
      var observer = function() {
        Ember.run.once(bindView, 'rerenderIfNeeded');
      };

      // Observes the given property on the context and
      // tells the Ember._BindableSpan to re-render. If property
      // is an empty string, we are printing the current context
      // object ({{this}}) so updating it is not our responsibility.
      if (property !== '') {
        Ember.addObserver(ctx, property, observer);
      }
    } else {
      // The object is not observable, so just render it out and
      // be done with it.
      data.buffer.push(getPath(this, property, options));
    }
  };

  /**
    '_triageMustache' is used internally select between a binding and helper for
    the given context. Until this point, it would be hard to determine if the
    mustache is a property reference or a regular helper reference. This triage
    helper resolves that.

    This would not be typically invoked by directly.

    @private
    @name Handlebars.helpers._triageMustache
    @param {String} property Property/helperID to triage
    @param {Function} fn Context to provide for rendering
    @returns {String} HTML string
  */
  EmberHandlebars.registerHelper('_triageMustache', function(property, fn) {
    ember_assert("You cannot pass more than one argument to the _triageMustache helper", arguments.length <= 2);
    if (helpers[property]) {
      return helpers[property].call(this, fn);
    }
    else {
      return helpers.bind.apply(this, arguments);
    }
  });

  /**
    `bind` can be used to display a value, then update that value if it
    changes. For example, if you wanted to print the `title` property of
    `content`:

        {{bind "content.title"}}

    This will return the `title` property as a string, then create a new
    observer at the specified path. If it changes, it will update the value in
    DOM. Note that if you need to support IE7 and IE8 you must modify the
    model objects properties using Ember.get() and Ember.set() for this to work as
    it relies on Ember's KVO system.  For all other browsers this will be handled
    for you automatically.

    @private
    @name Handlebars.helpers.bind
    @param {String} property Property to bind
    @param {Function} fn Context to provide for rendering
    @returns {String} HTML string
  */
  EmberHandlebars.registerHelper('bind', function(property, fn) {
    ember_assert("You cannot pass more than one argument to the bind helper", arguments.length <= 2);

    var context = (fn.contexts && fn.contexts[0]) || this;

    return bind.call(context, property, fn, false, function(result) {
      return !Ember.none(result);
    });
  });

  /**
    Use the `boundIf` helper to create a conditional that re-evaluates
    whenever the bound value changes.

        {{#boundIf "content.shouldDisplayTitle"}}
          {{content.title}}
        {{/boundIf}}

    @private
    @name Handlebars.helpers.boundIf
    @param {String} property Property to bind
    @param {Function} fn Context to provide for rendering
    @returns {String} HTML string
  */
  EmberHandlebars.registerHelper('boundIf', function(property, fn) {
    var context = (fn.contexts && fn.contexts[0]) || this;
    var func = function(result) {
      if (Ember.typeOf(result) === 'array') {
        return get(result, 'length') !== 0;
      } else {
        return !!result;
      }
    };

    return bind.call(context, property, fn, true, func, func);
  });
})();

/**
  @name Handlebars.helpers.with
  @param {Function} context
  @param {Hash} options
  @returns {String} HTML string
*/
EmberHandlebars.registerHelper('with', function(context, options) {
  ember_assert("You must pass exactly one argument to the with helper", arguments.length === 2);
  ember_assert("You must pass a block to the with helper", options.fn && options.fn !== Handlebars.VM.noop);

  return helpers.bind.call(options.contexts[0], context, options);
});


/**
  @name Handlebars.helpers.if
  @param {Function} context
  @param {Hash} options
  @returns {String} HTML string
*/
EmberHandlebars.registerHelper('if', function(context, options) {
  ember_assert("You must pass exactly one argument to the if helper", arguments.length === 2);
  ember_assert("You must pass a block to the if helper", options.fn && options.fn !== Handlebars.VM.noop);

  return helpers.boundIf.call(options.contexts[0], context, options);
});

/**
  @name Handlebars.helpers.unless
  @param {Function} context
  @param {Hash} options
  @returns {String} HTML string
*/
EmberHandlebars.registerHelper('unless', function(context, options) {
  ember_assert("You must pass exactly one argument to the unless helper", arguments.length === 2);
  ember_assert("You must pass a block to the unless helper", options.fn && options.fn !== Handlebars.VM.noop);

  var fn = options.fn, inverse = options.inverse;

  options.fn = inverse;
  options.inverse = fn;

  return helpers.boundIf.call(options.contexts[0], context, options);
});

/**
  `bindAttr` allows you to create a binding between DOM element attributes and
  Ember objects. For example:

      <img {{bindAttr src="imageUrl" alt="imageTitle"}}>

  @name Handlebars.helpers.bindAttr
  @param {Hash} options
  @returns {String} HTML string
*/
EmberHandlebars.registerHelper('bindAttr', function(options) {

  var attrs = options.hash;

  ember_assert("You must specify at least one hash argument to bindAttr", !!Ember.keys(attrs).length);

  var view = options.data.view;
  var ret = [];
  var ctx = this;

  // Generate a unique id for this element. This will be added as a
  // data attribute to the element so it can be looked up when
  // the bound property changes.
  var dataId = ++Ember.$.uuid;

  // Handle classes differently, as we can bind multiple classes
  var classBindings = attrs['class'];
  if (classBindings !== null && classBindings !== undefined) {
    var classResults = EmberHandlebars.bindClasses(this, classBindings, view, dataId, options);
    ret.push('class="' + classResults.join(' ') + '"');
    delete attrs['class'];
  }

  var attrKeys = Ember.keys(attrs);

  // For each attribute passed, create an observer and emit the
  // current value of the property as an attribute.
  forEach(attrKeys, function(attr) {
    var property = attrs[attr];

    ember_assert(fmt("You must provide a String for a bound attribute, not %@", [property]), typeof property === 'string');

    var value = (property === 'this') ? ctx : getPath(ctx, property, options),
        type = Ember.typeOf(value);

    ember_assert(fmt("Attributes must be numbers, strings or booleans, not %@", [value]), value === null || value === undefined || type === 'number' || type === 'string' || type === 'boolean');

    var observer, invoker;

    /** @private */
    observer = function observer() {
      var result = getPath(ctx, property, options);

      ember_assert(fmt("Attributes must be numbers, strings or booleans, not %@", [result]), result === null || result === undefined || typeof result === 'number' || typeof result === 'string' || typeof result === 'boolean');

      var elem = view.$("[data-bindattr-" + dataId + "='" + dataId + "']");

      // If we aren't able to find the element, it means the element
      // to which we were bound has been removed from the view.
      // In that case, we can assume the template has been re-rendered
      // and we need to clean up the observer.
      if (elem.length === 0) {
        Ember.removeObserver(ctx, property, invoker);
        return;
      }

      Ember.View.applyAttributeBindings(elem, attr, result);
    };

    /** @private */
    invoker = function() {
      Ember.run.once(observer);
    };

    // Add an observer to the view for when the property changes.
    // When the observer fires, find the element using the
    // unique data id and update the attribute to the new value.
    if (property !== 'this') {
      Ember.addObserver(ctx, property, invoker);
    }

    // if this changes, also change the logic in ember-views/lib/views/view.js
    if ((type === 'string' || (type === 'number' && !isNaN(value)))) {
      ret.push(attr + '="' + value + '"');
    } else if (value && type === 'boolean') {
      ret.push(attr + '="' + attr + '"');
    }
  }, this);

  // Add the unique identifier
  // NOTE: We use all lower-case since Firefox has problems with mixed case in SVG
  ret.push('data-bindattr-' + dataId + '="' + dataId + '"');
  return new EmberHandlebars.SafeString(ret.join(' '));
});

/**
  Helper that, given a space-separated string of property paths and a context,
  returns an array of class names. Calling this method also has the side
  effect of setting up observers at those property paths, such that if they
  change, the correct class name will be reapplied to the DOM element.

  For example, if you pass the string "fooBar", it will first look up the
  "fooBar" value of the context. If that value is true, it will add the
  "foo-bar" class to the current element (i.e., the dasherized form of
  "fooBar"). If the value is a string, it will add that string as the class.
  Otherwise, it will not add any new class name.

  @param {Ember.Object} context
    The context from which to lookup properties

  @param {String} classBindings
    A string, space-separated, of class bindings to use

  @param {Ember.View} view
    The view in which observers should look for the element to update

  @param {Srting} bindAttrId
    Optional bindAttr id used to lookup elements

  @returns {Array} An array of class names to add
*/
EmberHandlebars.bindClasses = function(context, classBindings, view, bindAttrId, options) {
  var ret = [], newClass, value, elem;

  // Helper method to retrieve the property from the context and
  // determine which class string to return, based on whether it is
  // a Boolean or not.
  var classStringForProperty = function(property) {
    var split = property.split(':'),
        className = split[1];

    property = split[0];

    var val = property !== '' ? getPath(context, property, options) : true;

    // If value is a Boolean and true, return the dasherized property
    // name.
    if (val === true) {
      if (className) { return className; }

      // Normalize property path to be suitable for use
      // as a class name. For exaple, content.foo.barBaz
      // becomes bar-baz.
      var parts = property.split('.');
      return Ember.String.dasherize(parts[parts.length-1]);

    // If the value is not false, undefined, or null, return the current
    // value of the property.
    } else if (val !== false && val !== undefined && val !== null) {
      return val;

    // Nothing to display. Return null so that the old class is removed
    // but no new class is added.
    } else {
      return null;
    }
  };

  // For each property passed, loop through and setup
  // an observer.
  forEach(classBindings.split(' '), function(binding) {

    // Variable in which the old class value is saved. The observer function
    // closes over this variable, so it knows which string to remove when
    // the property changes.
    var oldClass;

    var observer, invoker;

    // Set up an observer on the context. If the property changes, toggle the
    // class name.
    /** @private */
    observer = function() {
      // Get the current value of the property
      newClass = classStringForProperty(binding);
      elem = bindAttrId ? view.$("[data-bindattr-" + bindAttrId + "='" + bindAttrId + "']") : view.$();

      // If we can't find the element anymore, a parent template has been
      // re-rendered and we've been nuked. Remove the observer.
      if (elem.length === 0) {
        Ember.removeObserver(context, binding, invoker);
      } else {
        // If we had previously added a class to the element, remove it.
        if (oldClass) {
          elem.removeClass(oldClass);
        }

        // If necessary, add a new class. Make sure we keep track of it so
        // it can be removed in the future.
        if (newClass) {
          elem.addClass(newClass);
          oldClass = newClass;
        } else {
          oldClass = null;
        }
      }
    };

    /** @private */
    invoker = function() {
      Ember.run.once(observer);
    };

    var property = binding.split(':')[0];
    if (property !== '') {
      Ember.addObserver(context, property, invoker);
    }

    // We've already setup the observer; now we just need to figure out the
    // correct behavior right now on the first pass through.
    value = classStringForProperty(binding);

    if (value) {
      ret.push(value);

      // Make sure we save the current value so that it can be removed if the
      // observer fires.
      oldClass = value;
    }
  });

  return ret;
};

