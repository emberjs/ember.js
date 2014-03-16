/**
@module ember
@submodule ember-handlebars
*/

import Ember from "ember-metal/core"; // Ember.assert, Ember.warn, uuid
// var emberAssert = Ember.assert, Ember.warn = Ember.warn;

import EmberHandlebars from "ember-handlebars-compiler";
var helpers = EmberHandlebars.helpers;
var SafeString = EmberHandlebars.SafeString;

import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";
import EmberStringUtils from "ember-runtime/system/string";
import {create} from "ember-metal/platform";
import isNone from 'ember-metal/is_none';
import EnumerableUtils from "ember-metal/enumerable_utils";
import {forEach} from "ember-metal/array";
import {View} from "ember-views/views/view";
import run from "ember-metal/run_loop";
import {_HandlebarsBoundView, SimpleHandlebarsView} from "ember-handlebars/views/handlebars_bound_view";
import {removeObserver} from "ember-metal/observer";
import {isGlobalPath} from "ember-metal/binding";
import {bind as emberBind} from "ember-metal/binding";
import {guidFor, typeOf} from "ember-metal/utils";
import jQuery from "ember-views/system/jquery";
import {isArray} from "ember-metal/utils";
import {normalizePath, handlebarsGet, getEscaped} from "ember-handlebars/ext";
import {getEscaped as handlebarsGetEscaped} from "ember-handlebars/ext";

import keys from "ember-runtime/keys";

var fmt = EmberStringUtils.fmt;
var o_create = create;

function exists(value) {
  return !isNone(value);
}

// Binds a property into the DOM. This will create a hook in DOM that the
// KVO system will look for and update if the property changes.
function bind(property, options, preserveContext, shouldDisplay, valueNormalizer, childProperties) {
  var data = options.data,
      fn = options.fn,
      inverse = options.inverse,
      view = data.view,
      normalized, observer, i;

  // we relied on the behavior of calling without
  // context to mean this === window, but when running
  // "use strict", it's possible for this to === undefined;
  var currentContext = this || window;

  normalized = normalizePath(currentContext, property, data);

  // Set up observers for observable objects
  if ('object' === typeof this) {
    if (data.insideGroup) {
      observer = function() {
        run.once(view, 'rerender');
      };

      var template, context, result = handlebarsGet(currentContext, property, options);

      result = valueNormalizer ? valueNormalizer(result) : result;

      context = preserveContext ? currentContext : result;
      if (shouldDisplay(result)) {
        template = fn;
      } else if (inverse) {
        template = inverse;
      }

      template(context, { data: options.data });
    } else {
      // Create the view that will wrap the output of this template/property
      // and add it to the nearest view's childViews array.
      // See the documentation of Ember._HandlebarsBoundView for more.
      var bindView = view.createChildView(Ember._HandlebarsBoundView, {
        preserveContext: preserveContext,
        shouldDisplayFunc: shouldDisplay,
        valueNormalizerFunc: valueNormalizer,
        displayTemplate: fn,
        inverseTemplate: inverse,
        path: property,
        pathRoot: currentContext,
        previousContext: currentContext,
        isEscaped: !options.hash.unescaped,
        templateData: options.data
      });

      if (options.hash.controller) {
        bindView.set('_contextController', this.container.lookupFactory('controller:'+options.hash.controller).create({
          container: currentContext.container,
          parentController: currentContext,
          target: currentContext
        }));
      }

      view.appendChild(bindView);

      observer = function() {
        run.scheduleOnce('render', bindView, 'rerenderIfNeeded');
      };
    }

    // Observes the given property on the context and
    // tells the Ember._HandlebarsBoundView to re-render. If property
    // is an empty string, we are printing the current context
    // object ({{this}}) so updating it is not our responsibility.
    if (normalized.path !== '') {
      view.registerObserver(normalized.root, normalized.path, observer);
      if (childProperties) {
        for (i=0; i<childProperties.length; i++) {
          view.registerObserver(normalized.root, normalized.path+'.'+childProperties[i], observer);
        }
      }
    }
  } else {
    // The object is not observable, so just render it out and
    // be done with it.
    data.buffer.push(handlebarsGetEscaped(currentContext, property, options));
  }
}

function simpleBind(currentContext, property, options) {
  var data = options.data,
      view = data.view,
      normalized, observer, pathRoot, output;

  normalized = normalizePath(currentContext, property, data);
  pathRoot = normalized.root;

  // Set up observers for observable objects
  if (pathRoot && ('object' === typeof pathRoot)) {
    if (data.insideGroup) {
      observer = function() {
        run.once(view, 'rerender');
      };

      output = handlebarsGetEscaped(currentContext, property, options);

      data.buffer.push(output);
    } else {
      var bindView = new SimpleHandlebarsView(
        property, currentContext, !options.hash.unescaped, options.data
      );

      bindView._parentView = view;
      view.appendChild(bindView);

      observer = function() {
        run.scheduleOnce('render', bindView, 'rerender');
      };
    }

    // Observes the given property on the context and
    // tells the Ember._HandlebarsBoundView to re-render. If property
    // is an empty string, we are printing the current context
    // object ({{this}}) so updating it is not our responsibility.
    if (normalized.path !== '') {
      view.registerObserver(normalized.root, normalized.path, observer);
    }
  } else {
    // The object is not observable, so just render it out and
    // be done with it.
    output = handlebarsGetEscaped(currentContext, property, options);
    data.buffer.push(output);
  }
}

function shouldDisplayIfHelperContent(result) {
  var truthy = result && get(result, 'isTruthy');
  if (typeof truthy === 'boolean') { return truthy; }

  if (isArray(result)) {
    return get(result, 'length') !== 0;
  } else {
    return !!result;
  }
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

  if (helpers[property]) {
    return helpers[property].call(this, options);
  }

  var helper = EmberHandlebars.resolveHelper(options.data.view.container, property);
  if (helper) {
    return helper.call(this, options);
  }

  return helpers.bind.call(this, property, options);
}

function resolveHelper(container, name) {
  if (!container || name.indexOf('-') === -1) {
    return;
  }

  var helper = container.lookup('helper:' + name);
  if (!helper) {
    var componentLookup = container.lookup('component-lookup:main');
    Ember.assert("Could not find 'component-lookup:main' on the provided container, which is necessary for performing component lookups", componentLookup);

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
    return simpleBind(context, property, options);
  }

  return bind.call(context, property, options, false, exists);
}

/**
  Use the `boundIf` helper to create a conditional that re-evaluates
  whenever the truthiness of the bound value changes.

  ```handlebars
  {{#boundIf "content.shouldDisplayTitle"}}
    {{content.title}}
  {{/boundIf}}
  ```

  @private
  @method boundIf
  @for Ember.Handlebars.helpers
  @param {String} property Property to bind
  @param {Function} fn Context to provide for rendering
  @return {String} HTML string
*/
function boundIfHelper(property, fn) {
  var context = (fn.contexts && fn.contexts.length) ? fn.contexts[0] : this;

  return bind.call(context, property, fn, true, shouldDisplayIfHelperContent, shouldDisplayIfHelperContent, ['isTruthy', 'length']);
}


/**
  @private

  Use the `unboundIf` helper to create a conditional that evaluates once.

  ```handlebars
  {{#unboundIf "content.shouldDisplayTitle"}}
    {{content.title}}
  {{/unboundIf}}
  ```

  @method unboundIf
  @for Ember.Handlebars.helpers
  @param {String} property Property to bind
  @param {Function} fn Context to provide for rendering
  @return {String} HTML string
*/
function unboundIfHelper(property, fn) {
  var context = (fn.contexts && fn.contexts.length) ? fn.contexts[0] : this,
      data = fn.data,
      template = fn.fn,
      inverse = fn.inverse,
      normalized, propertyValue, result;

  normalized = normalizePath(context, property, data);
  propertyValue = handlebarsGet(context, property, fn);

  if (!shouldDisplayIfHelperContent(propertyValue)) {
    template = inverse;
  }

  template(context, { data: data });
}

/**
  Use the `{{with}}` helper when you want to scope context. Take the following code as an example:

  ```handlebars
  <h5>{{user.name}}</h5>

  <div class="role">
    <h6>{{user.role.label}}</h6>
    <span class="role-id">{{user.role.id}}</span>

    <p class="role-desc">{{user.role.description}}</p>
  </div>
  ```

  `{{with}}` can be our best friend in these cases,
  instead of writing `user.role.*` over and over, we use `{{#with user.role}}`.
  Now the context within the `{{#with}} .. {{/with}}` block is `user.role` so you can do the following:

  ```handlebars
  <h5>{{user.name}}</h5>

  <div class="role">
    {{#with user.role}}
      <h6>{{label}}</h6>
      <span class="role-id">{{id}}</span>

      <p class="role-desc">{{description}}</p>
    {{/with}}
  </div>
  ```

  ### `as` operator

  This operator aliases the scope to a new name. It's helpful for semantic clarity and to retain
  default scope or to reference from another `{{with}}` block.

  ```handlebars
  // posts might not be
  {{#with user.posts as blogPosts}}
    <div class="notice">
      There are {{blogPosts.length}} blog posts written by {{user.name}}.
    </div>

    {{#each post in blogPosts}}
      <li>{{post.title}}</li>
    {{/each}}
  {{/with}}
  ```

  Without the `as` operator, it would be impossible to reference `user.name` in the example above.

  NOTE: The alias should not reuse a name from the bound property path.
  For example: `{{#with foo.bar as foo}}` is not supported because it attempts to alias using
  the first part of the property path, `foo`. Instead, use `{{#with foo.bar as baz}}`.

  ### `controller` option

  Adding `controller='something'` instructs the `{{with}}` helper to create and use an instance of
  the specified controller with the new context as its content.

  This is very similar to using an `itemController` option with the `{{each}}` helper.

  ```handlebars
  {{#with users.posts controller='userBlogPosts'}}
    {{!- The current context is wrapped in our controller instance }}
  {{/with}}
  ```

  In the above example, the template provided to the `{{with}}` block is now wrapped in the
  `userBlogPost` controller, which provides a very elegant way to decorate the context with custom
  functions/properties.

  @method with
  @for Ember.Handlebars.helpers
  @param {Function} context
  @param {Hash} options
  @return {String} HTML string
*/
function withHelper(context, options) {
  if (arguments.length === 4) {
    var keywordName, path, rootPath, normalized, contextPath;

    Ember.assert("If you pass more than one argument to the with helper, it must be in the form #with foo as bar", arguments[1] === "as");
    options = arguments[3];
    keywordName = arguments[2];
    path = arguments[0];

    Ember.assert("You must pass a block to the with helper", options.fn && options.fn !== Handlebars.VM.noop);

    var localizedOptions = o_create(options);
    localizedOptions.data = o_create(options.data);
    localizedOptions.data.keywords = o_create(options.data.keywords || {});

    if (isGlobalPath(path)) {
      contextPath = path;
    } else {
      normalized = normalizePath(this, path, options.data);
      path = normalized.path;
      rootPath = normalized.root;

      // This is a workaround for the fact that you cannot bind separate objects
      // together. When we implement that functionality, we should use it here.
      var contextKey = jQuery.expando + guidFor(rootPath);
      localizedOptions.data.keywords[contextKey] = rootPath;
      // if the path is '' ("this"), just bind directly to the current context
      contextPath = path ? contextKey + '.' + path : contextKey;
    }

    emberBind(localizedOptions.data.keywords, keywordName, contextPath);

    return bind.call(this, path, localizedOptions, true, exists);
  } else {
    Ember.assert("You must pass exactly one argument to the with helper", arguments.length === 2);
    Ember.assert("You must pass a block to the with helper", options.fn && options.fn !== Handlebars.VM.noop);
    return helpers.bind.call(options.contexts[0], context, options);
  }
}


/**
  See [boundIf](/api/classes/Ember.Handlebars.helpers.html#method_boundIf)
  and [unboundIf](/api/classes/Ember.Handlebars.helpers.html#method_unboundIf)

  @method if
  @for Ember.Handlebars.helpers
  @param {Function} context
  @param {Hash} options
  @return {String} HTML string
*/
function ifHelper(context, options) {
  Ember.assert("You must pass exactly one argument to the if helper", arguments.length === 2);
  Ember.assert("You must pass a block to the if helper", options.fn && options.fn !== Handlebars.VM.noop);
  if (options.data.isUnbound) {
    return helpers.unboundIf.call(options.contexts[0], context, options);
  } else {
    return helpers.boundIf.call(options.contexts[0], context, options);
  }
}

/**
  @method unless
  @for Ember.Handlebars.helpers
  @param {Function} context
  @param {Hash} options
  @return {String} HTML string
*/
function unlessHelper(context, options) {
  Ember.assert("You must pass exactly one argument to the unless helper", arguments.length === 2);
  Ember.assert("You must pass a block to the unless helper", options.fn && options.fn !== Handlebars.VM.noop);

  var fn = options.fn, inverse = options.inverse;

  options.fn = inverse;
  options.inverse = fn;

  if (options.data.isUnbound) {
    return helpers.unboundIf.call(options.contexts[0], context, options);
  } else {
    return helpers.boundIf.call(options.contexts[0], context, options);
  }
}

/**
  `bind-attr` allows you to create a binding between DOM element attributes and
  Ember objects. For example:

  ```handlebars
  <img {{bind-attr src="imageUrl" alt="imageTitle"}}>
  ```

  The above handlebars template will fill the `<img>`'s `src` attribute will
  the value of the property referenced with `"imageUrl"` and its `alt`
  attribute with the value of the property referenced with `"imageTitle"`.

  If the rendering context of this template is the following object:

  ```javascript
  {
    imageUrl: 'http://lolcats.info/haz-a-funny',
    imageTitle: 'A humorous image of a cat'
  }
  ```

  The resulting HTML output will be:

  ```html
  <img src="http://lolcats.info/haz-a-funny" alt="A humorous image of a cat">
  ```

  `bind-attr` cannot redeclare existing DOM element attributes. The use of `src`
  in the following `bind-attr` example will be ignored and the hard coded value
  of `src="/failwhale.gif"` will take precedence:

  ```handlebars
  <img src="/failwhale.gif" {{bind-attr src="imageUrl" alt="imageTitle"}}>
  ```

  ### `bind-attr` and the `class` attribute

  `bind-attr` supports a special syntax for handling a number of cases unique
  to the `class` DOM element attribute. The `class` attribute combines
  multiple discrete values into a single attribute as a space-delimited
  list of strings. Each string can be:

  * a string return value of an object's property.
  * a boolean return value of an object's property
  * a hard-coded value

  A string return value works identically to other uses of `bind-attr`. The
  return value of the property will become the value of the attribute. For
  example, the following view and template:

  ```javascript
    AView = View.extend({
      someProperty: function() {
        return "aValue";
      }.property()
    })
  ```

  ```handlebars
  <img {{bind-attr class="view.someProperty}}>
  ```

  Result in the following rendered output:

  ```html
  <img class="aValue">
  ```

  A boolean return value will insert a specified class name if the property
  returns `true` and remove the class name if the property returns `false`.

  A class name is provided via the syntax
  `somePropertyName:class-name-if-true`.

  ```javascript
  AView = View.extend({
    someBool: true
  })
  ```

  ```handlebars
  <img {{bind-attr class="view.someBool:class-name-if-true"}}>
  ```

  Result in the following rendered output:

  ```html
  <img class="class-name-if-true">
  ```

  An additional section of the binding can be provided if you want to
  replace the existing class instead of removing it when the boolean
  value changes:

  ```handlebars
  <img {{bind-attr class="view.someBool:class-name-if-true:class-name-if-false"}}>
  ```

  A hard-coded value can be used by prepending `:` to the desired
  class name: `:class-name-to-always-apply`.

  ```handlebars
  <img {{bind-attr class=":class-name-to-always-apply"}}>
  ```

  Results in the following rendered output:

  ```html
  <img class="class-name-to-always-apply">
  ```

  All three strategies - string return value, boolean return value, and
  hard-coded value – can be combined in a single declaration:

  ```handlebars
  <img {{bind-attr class=":class-name-to-always-apply view.someBool:class-name-if-true view.someProperty"}}>
  ```

  @method bind-attr
  @for Ember.Handlebars.helpers
  @param {Hash} options
  @return {String} HTML string
*/
function bindAttrHelper(options) {
  var attrs = options.hash;

  Ember.assert("You must specify at least one hash argument to bind-attr", !!keys(attrs).length);

  var view = options.data.view;
  var ret = [];

  // we relied on the behavior of calling without
  // context to mean this === window, but when running
  // "use strict", it's possible for this to === undefined;
  var ctx = this || window;

  // Generate a unique id for this element. This will be added as a
  // data attribute to the element so it can be looked up when
  // the bound property changes.
  var dataId = ++Ember.uuid;

  // Handle classes differently, as we can bind multiple classes
  var classBindings = attrs['class'];
  if (classBindings != null) {
    var classResults = bindClasses(ctx, classBindings, view, dataId, options);

    ret.push('class="' + Handlebars.Utils.escapeExpression(classResults.join(' ')) + '"');
    delete attrs['class'];
  }

  var attrKeys = keys(attrs);

  // For each attribute passed, create an observer and emit the
  // current value of the property as an attribute.
  forEach.call(attrKeys, function(attr) {
    var path = attrs[attr],
        normalized;

    Ember.assert(fmt("You must provide an expression as the value of bound attribute. You specified: %@=%@", [attr, path]), typeof path === 'string');

    normalized = normalizePath(ctx, path, options.data);

    var value = (path === 'this') ? normalized.root : handlebarsGet(ctx, path, options),
        type = typeOf(value);

    Ember.assert(fmt("Attributes must be numbers, strings or booleans, not %@", [value]), value === null || value === undefined || type === 'number' || type === 'string' || type === 'boolean');

    var observer, invoker;

    observer = function observer() {
      var result = handlebarsGet(ctx, path, options);

      Ember.assert(fmt("Attributes must be numbers, strings or booleans, not %@", [result]),
                   result === null || result === undefined || typeof result === 'number' ||
                     typeof result === 'string' || typeof result === 'boolean');

      var elem = view.$("[data-bindattr-" + dataId + "='" + dataId + "']");

      // If we aren't able to find the element, it means the element
      // to which we were bound has been removed from the view.
      // In that case, we can assume the template has been re-rendered
      // and we need to clean up the observer.
      if (!elem || elem.length === 0) {
        removeObserver(normalized.root, normalized.path, invoker);
        return;
      }

      View.applyAttributeBindings(elem, attr, result);
    };

    // Add an observer to the view for when the property changes.
    // When the observer fires, find the element using the
    // unique data id and update the attribute to the new value.
    // Note: don't add observer when path is 'this' or path
    // is whole keyword e.g. {{#each x in list}} ... {{bind-attr attr="x"}}
    if (path !== 'this' && !(normalized.isKeyword && normalized.path === '' )) {
      view.registerObserver(normalized.root, normalized.path, observer);
    }

    // if this changes, also change the logic in ember-views/lib/views/view.js
    if ((type === 'string' || (type === 'number' && !isNaN(value)))) {
      ret.push(attr + '="' + Handlebars.Utils.escapeExpression(value) + '"');
    } else if (value && type === 'boolean') {
      // The developer controls the attr name, so it should always be safe
      ret.push(attr + '="' + attr + '"');
    }
  }, this);

  // Add the unique identifier
  // NOTE: We use all lower-case since Firefox has problems with mixed case in SVG
  ret.push('data-bindattr-' + dataId + '="' + dataId + '"');
  return new SafeString(ret.join(' '));
}

/**
  See `bind-attr`

  @method bindAttr
  @for Ember.Handlebars.helpers
  @deprecated
  @param {Function} context
  @param {Hash} options
  @return {String} HTML string
*/
function bindAttrHelperDeprecated() {
  Ember.warn("The 'bindAttr' view helper is deprecated in favor of 'bind-attr'");
  return helpers['bind-attr'].apply(this, arguments);
}

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

  @private
  @method bindClasses
  @for Ember.Handlebars
  @param {Ember.Object} context The context from which to lookup properties
  @param {String} classBindings A string, space-separated, of class bindings
    to use
  @param {View} view The view in which observers should look for the
    element to update
  @param {Srting} bindAttrId Optional bindAttr id used to lookup elements
  @return {Array} An array of class names to add
*/
function bindClasses(context, classBindings, view, bindAttrId, options) {
  var ret = [], newClass, value, elem;

  // Helper method to retrieve the property from the context and
  // determine which class string to return, based on whether it is
  // a Boolean or not.
  var classStringForPath = function(root, parsedPath, options) {
    var val,
        path = parsedPath.path;

    if (path === 'this') {
      val = root;
    } else if (path === '') {
      val = true;
    } else {
      val = handlebarsGet(root, path, options);
    }

    return View._classStringForValue(path, val, parsedPath.className, parsedPath.falsyClassName);
  };

  // For each property passed, loop through and setup
  // an observer.
  forEach.call(classBindings.split(' '), function(binding) {

    // Variable in which the old class value is saved. The observer function
    // closes over this variable, so it knows which string to remove when
    // the property changes.
    var oldClass;

    var observer, invoker;

    var parsedPath = View._parsePropertyPath(binding),
        path = parsedPath.path,
        pathRoot = context,
        normalized;

    if (path !== '' && path !== 'this') {
      normalized = normalizePath(context, path, options.data);

      pathRoot = normalized.root;
      path = normalized.path;
    }

    // Set up an observer on the context. If the property changes, toggle the
    // class name.
    observer = function() {
      // Get the current value of the property
      newClass = classStringForPath(context, parsedPath, options);
      elem = bindAttrId ? view.$("[data-bindattr-" + bindAttrId + "='" + bindAttrId + "']") : view.$();

      // If we can't find the element anymore, a parent template has been
      // re-rendered and we've been nuked. Remove the observer.
      if (!elem || elem.length === 0) {
        removeObserver(pathRoot, path, invoker);
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

    if (path !== '' && path !== 'this') {
      view.registerObserver(pathRoot, path, observer);
    }

    // We've already setup the observer; now we just need to figure out the
    // correct behavior right now on the first pass through.
    value = classStringForPath(context, parsedPath, options);

    if (value) {
      ret.push(value);

      // Make sure we save the current value so that it can be removed if the
      // observer fires.
      oldClass = value;
    }
  });

  return ret;
};

export {bind, _triageMustacheHelper, resolveHelper, bindHelper, boundIfHelper, unboundIfHelper, withHelper, ifHelper, unlessHelper, bindAttrHelper, bindAttrHelperDeprecated, bindClasses}
