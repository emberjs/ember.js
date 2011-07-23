// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars */

require('sproutcore-handlebars/ext');
require('sproutcore-handlebars/views/bindable_span');

var get = SC.get, getPath = SC.getPath, fmt = SC.String.fmt;

(function() {
  // Binds a property into the DOM. This will create a hook in DOM that the
  // KVO system will look for and upate if the property changes.
  var bind = function(property, options, preserveContext, shouldDisplay) {
    var data = options.data,
        fn = options.fn,
        inverse = options.inverse,
        view = data.view,
        ctx  = this;

    // Set up observers for observable objects
    if ('object' === typeof this) {
      // Create the view that will wrap the output of this template/property 
      // and add it to the nearest view's childViews array.
      // See the documentation of SC._BindableSpanView for more.
      var bindView = view.createChildView(SC._BindableSpanView, {
        preserveContext: preserveContext,
        shouldDisplayFunc: shouldDisplay,
        displayTemplate: fn,
        inverseTemplate: inverse,
        property: property,
        previousContext: ctx,
        isEscaped: options.hash.escaped,
	tagName: options.hash.tagName || 'span'
      });

      var observer, invoker;

      view.appendChild(bindView);

      observer = function() {
        if (get(bindView, 'element')) {
          bindView.rerender();
        } else {
          // If no layer can be found, we can assume somewhere
          // above it has been re-rendered, so remove the
          // observer.
          SC.removeObserver(ctx, property, invoker);
        }
      };

      invoker = function() {
        SC.run.once(observer);
      };

      // Observes the given property on the context and
      // tells the SC._BindableSpan to re-render.
      SC.addObserver(ctx, property, invoker);
    } else {
      // The object is not observable, so just render it out and
      // be done with it.
      data.buffer.push(getPath(this, property));
    }
  };

  /**
    `bind` can be used to display a value, then update that value if it 
    changes. For example, if you wanted to print the `title` property of 
    `content`:

        {{bind "content.title"}}

    This will return the `title` property as a string, then create a new 
    observer at the specified path. If it changes, it will update the value in 
    DOM. Note that if you need to support IE7 and IE8 you must modify the 
    model objects properties using SC.get() and SC.set() for this to work as 
    it relies on SC's KVO system.  For all other browsers this will be handled
    for you automatically.

    @private
    @name Handlebars.helpers.bind
    @param {String} property Property to bind
    @param {Function} fn Context to provide for rendering
    @returns {String} HTML string
  */
  Handlebars.registerHelper('bind', function(property, fn) {
    sc_assert("You cannot pass more than one argument to the bind helper", arguments.length <= 2);

    return bind.call(this, property, fn, false, function(result) {
      return !SC.none(result);
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
  Handlebars.registerHelper('boundIf', function(property, fn) {
    return bind.call(this, property, fn, true, function(result) {
      if (SC.typeOf(result) === 'array') {
        return get(result, 'length') !== 0;
      } else {
        return !!result;
      }
    } );
  });
})();

/**
  @name Handlebars.helpers.with
  @param {Function} context
  @param {Hash} options
  @returns {String} HTML string
*/
Handlebars.registerHelper('with', function(context, options) {
  sc_assert("You must pass exactly one argument to the with helper", arguments.length == 2);
  sc_assert("You must pass a block to the with helper", options.fn && options.fn !== Handlebars.VM.noop);

  return Handlebars.helpers.bind.call(options.contexts[0], context, options);
});


/**
  @name Handlebars.helpers.if
  @param {Function} context
  @param {Hash} options
  @returns {String} HTML string
*/
Handlebars.registerHelper('if', function(context, options) {
  sc_assert("You must pass exactly one argument to the if helper", arguments.length == 2);
  sc_assert("You must pass a block to the if helper", options.fn && options.fn !== Handlebars.VM.noop);

  return Handlebars.helpers.boundIf.call(options.contexts[0], context, options);
});

/**
  @name Handlebars.helpers.unless
  @param {Function} context
  @param {Hash} options
  @returns {String} HTML string
*/
Handlebars.registerHelper('unless', function(context, options) {
  sc_assert("You must pass exactly one argument to the unless helper", arguments.length == 2);
  sc_assert("You must pass a block to the unless helper", options.fn && options.fn !== Handlebars.VM.noop);

  var fn = options.fn, inverse = options.inverse;

  options.fn = inverse;
  options.inverse = fn;

  return Handlebars.helpers.boundIf.call(options.contexts[0], context, options);
});

/**
  `bindAttr` allows you to create a binding between DOM element attributes and
  SproutCore objects. For example:

      <img {{bindAttr src="imageUrl" alt="imageTitle"}}>

  @name Handlebars.helpers.bindAttr
  @param {Hash} options
  @returns {String} HTML string
*/
Handlebars.registerHelper('bindAttr', function(options) {

  var attrs = options.hash;

  sc_assert("You must specify at least one hash argument to bindAttr", !!SC.keys(attrs).length);

  var view = options.data.view;
  var ret = [];
  var ctx = this;

  // Generate a unique id for this element. This will be added as a
  // data attribute to the element so it can be looked up when
  // the bound property changes.
  var dataId = jQuery.uuid++;

  // Handle classes differently, as we can bind multiple classes
  var classBindings = attrs['class'];
  if (classBindings !== null && classBindings !== undefined) {
    var classResults = SC.Handlebars.bindClasses(this, classBindings, view, dataId);
    ret.push('class="' + classResults.join(' ') + '"');
    delete attrs['class'];
  }

  var attrKeys = SC.keys(attrs);

  // For each attribute passed, create an observer and emit the
  // current value of the property as an attribute.
  attrKeys.forEach(function(attr) {
    var property = attrs[attr];

    sc_assert(fmt("You must provide a String for a bound attribute, not %@", [property]), typeof property === 'string');

    var value = getPath(ctx, property);

    sc_assert(fmt("Attributes must be numbers, strings or booleans, not %@", [value]), value == null || typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean');

    var observer, invoker;

    observer = function observer() {
      var result = getPath(ctx, property);

      sc_assert(fmt("Attributes must be numbers, strings or booleans, not %@", [result]), result == null || typeof result === 'number' || typeof result === 'string' || typeof result === 'boolean');

      var elem = view.$("[data-handlebars-id='" + dataId + "']");

      // If we aren't able to find the element, it means the element
      // to which we were bound has been removed from the view.
      // In that case, we can assume the template has been re-rendered
      // and we need to clean up the observer.
      if (elem.length === 0) {
        SC.removeObserver(ctx, property, invoker);
        return;
      }

      var currentValue = elem.attr(attr);

      // A false result will remove the attribute from the element. This is
      // to support attributes such as disabled, whose presence is meaningful.
      if (result === false && currentValue) {
        elem.removeAttr(attr);

      // Likewise, a true result will set the attribute's name as the value.
      } else if (result === true && currentValue !== attr) {
        elem.attr(attr, attr);

      } else if (currentValue !== result) {
        elem.attr(attr, result);
      }
    };

    invoker = function() {
      SC.run.once(observer);
    };

    // Add an observer to the view for when the property changes.
    // When the observer fires, find the element using the
    // unique data id and update the attribute to the new value.
    SC.addObserver(ctx, property, invoker);

    // Use the attribute's name as the value when it is YES
    if (value === true) {
      value = attr;
    }

    // Do not add the attribute when the value is false
    if (value !== false) {
      // Return the current value, in the form src="foo.jpg"
      ret.push(attr + '="' + value + '"');
    }
  }, this);

  // Add the unique identifier
  ret.push('data-handlebars-id="' + dataId + '"');
  return new Handlebars.SafeString(ret.join(' '));
});

/**
  Helper that, given a space-separated string of property paths and a context,
  returns an array of class names. Calling this method also has the side 
  effect of setting up observers at those property paths, such that if they 
  change, the correct class name will be reapplied to the DOM element.

  For example, if you pass the string "fooBar", it will first look up the 
  "fooBar" value of the context. If that value is YES, it will add the 
  "foo-bar" class to the current element (i.e., the dasherized form of 
  "fooBar"). If the value is a string, it will add that string as the class. 
  Otherwise, it will not add any new class name.

  @param {SC.Object} context 
    The context from which to lookup properties

  @param {String} classBindings 
    A string, space-separated, of class bindings to use

  @param {SC.View} view
    The view in which observers should look for the element to update

  @param {String} id 
    Optional id use to lookup elements

  @returns {Array} An array of class names to add
*/
SC.Handlebars.bindClasses = function(context, classBindings, view, id) {
  var ret = [], newClass, value, elem;

  // Helper method to retrieve the property from the context and
  // determine which class string to return, based on whether it is
  // a Boolean or not.
  var classStringForProperty = function(property) {
    var val = getPath(context, property);

    // If value is a Boolean and true, return the dasherized property
    // name.
    if (val === YES) {
      // Normalize property path to be suitable for use
      // as a class name. For exaple, content.foo.barBaz
      // becomes bar-baz.
      return SC.String.dasherize(get(property.split('.'), 'lastObject'));

    // If the value is not NO, undefined, or null, return the current
    // value of the property.
    } else if (val !== NO && val !== undefined && val !== null) {
      return val;

    // Nothing to display. Return null so that the old class is removed
    // but no new class is added.
    } else {
      return null;
    }
  };

  // For each property passed, loop through and setup
  // an observer.
  classBindings.split(' ').forEach(function(property) {

    // Variable in which the old class value is saved. The observer function
    // closes over this variable, so it knows which string to remove when
    // the property changes.
    var oldClass;

    var observer, invoker;

    // Set up an observer on the context. If the property changes, toggle the
    // class name.
    observer = function() {
      // Get the current value of the property
      newClass = classStringForProperty(property);
      elem = id ? view.$("[data-handlebars-id='" + id + "']") : view.$();

      // If we can't find the element anymore, a parent template has been
      // re-rendered and we've been nuked. Remove the observer.
      if (elem.length === 0) {
        SC.removeObserver(context, property, invoker);
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

    invoker = function() {
      SC.run.once(observer);
    };

    SC.addObserver(context, property, invoker);

    // We've already setup the observer; now we just need to figure out the 
    // correct behavior right now on the first pass through.
    value = classStringForProperty(property);

    if (value) {
      ret.push(value);

      // Make sure we save the current value so that it can be removed if the 
      // observer fires.
      oldClass = value;
    }
  });

  return ret;
};

