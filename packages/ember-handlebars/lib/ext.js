import Ember from "ember-metal/core"; // Ember.FEATURES, Ember.assert, Ember.Handlebars, Ember.lookup

import { fmt } from "ember-runtime/system/string";

import EmberHandlebars from "ember-handlebars-compiler";

import { get } from "ember-metal/property_get";
import EmberError from "ember-metal/error";
import { IS_BINDING } from "ember-metal/mixin";

import View from "ember-views/views/view";
import {
  isGlobal as detectIsGlobal
} from "ember-metal/path_cache";

// late bound via requireModule because of circular dependencies.
var resolveHelper, SimpleBoundView;

import Stream from "ember-metal/streams/stream";
import {
  readArray,
  readHash
} from "ember-metal/streams/utils";
import handlebarsGet from "ember-htmlbars/compat/handlebars-get";

var slice = [].slice;

/**
  handlebarsGetView resolves a view based on strings passed into a template.
  For example:

  ```handlebars
  {{view "some-view"}}
  {{view view.someView}}
  {{view App.SomeView}} {{! deprecated }}
  ```

  A value is first checked to be a string- non-strings are presumed to be
  an object and returned. This handles the "access a view on a context"
  case (line 2 in the above examples).

  Next a string is normalized, then called on the context with `get`. If
  there is still no value, a GlobalPath will be fetched from the global
  context (raising a deprecation) and a localPath will be passed to the
  container to be looked up.

  @private
  @for Ember.Handlebars
  @param {Object} context The context of the template being rendered
  @param {String} path The path to be lookedup
  @param {Object} container The container
  @param {Object} data The template's data hash
*/
function handlebarsGetView(context, path, container, data) {
  var viewClass;
  if ('string' === typeof path) {
    if (!data) {
      throw new Error("handlebarsGetView: must pass data");
    }

    // Only lookup view class on context if there is a context. If not,
    // the global lookup path on get may kick in.
    var lazyValue = data.view.getStream(path);
    viewClass = lazyValue.value();
    var isGlobal = detectIsGlobal(path);

    if (!viewClass && !isGlobal) {
      Ember.assert("View requires a container to resolve views not passed in through the context", !!container);
      viewClass = container.lookupFactory('view:'+path);
    }
    if (!viewClass && isGlobal) {
      var globalViewClass = get(path);
      Ember.deprecate('Resolved the view "'+path+'" on the global context. Pass a view name to be looked' +
                      ' up on the container instead, such as {{view "select"}}.' +
                      ' http://emberjs.com/guides/deprecations#toc_global-lookup-of-views', !globalViewClass);
      if (globalViewClass) {
        viewClass = globalViewClass;
      }
    }
  } else {
    viewClass = path;
  }

  // Sometimes a view's value is yet another path
  if ('string' === typeof viewClass && data && data.view) {
    viewClass = handlebarsGetView(data.view, viewClass, container, data);
  }

  Ember.assert(
    fmt(path+" must be a subclass of Ember.View, not %@", [viewClass]),
    View.detect(viewClass)
  );

  return viewClass;
}

export function stringifyValue(value, shouldEscape) {
  if (value === null || value === undefined) {
    value = "";
  } else if (!(value instanceof Handlebars.SafeString)) {
    value = String(value);
  }

  if (shouldEscape) {
    value = Handlebars.Utils.escapeExpression(value);
  }

  return value;
}

/**
  Registers a helper in Handlebars that will be called if no property with the
  given name can be found on the current context object, and no helper with
  that name is registered.

  This throws an exception with a more helpful error message so the user can
  track down where the problem is happening.

  @private
  @method helperMissing
  @for Ember.Handlebars.helpers
  @param {String} path
  @param {Hash} options
*/
export function helperMissingHelper(path) {
  if (!resolveHelper) {
    resolveHelper = requireModule('ember-handlebars/helpers/binding')['resolveHelper'];
  } // ES6TODO: stupid circular dep

  var error, fmtError, view = "";

  var options = arguments[arguments.length - 1];

  var helper = resolveHelper(options.data.view.container, options.name);

  if (helper) {
    return helper.apply(this, arguments);
  }

  if (options.data) {
    view = options.data.view;
  }

  if (options.name.match(/-/)) {
    error = "%@ Handlebars error: Could not find component or helper named '%@'";
    fmtError = fmt(error, [view, options.name]);
  } else {
    error = "%@ Handlebars error: Could not find property '%@' on object %@.";
    fmtError = fmt(error, [view, options.name, this]);
  }

  throw new EmberError(fmtError);
}

/**
  @private
  @method blockHelperMissingHelper
  @for Ember.Handlebars.helpers
*/
export function blockHelperMissingHelper() {
  return;
}

/**
  Register a bound handlebars helper. Bound helpers behave similarly to regular
  handlebars helpers, with the added ability to re-render when the underlying data
  changes.

  ## Simple example

  ```javascript
  Ember.Handlebars.registerBoundHelper('capitalize', function(value) {
    return Ember.String.capitalize(value);
  });
  ```

  The above bound helper can be used inside of templates as follows:

  ```handlebars
  {{capitalize name}}
  ```

  In this case, when the `name` property of the template's context changes,
  the rendered value of the helper will update to reflect this change.

  ## Example with options

  Like normal handlebars helpers, bound helpers have access to the options
  passed into the helper call.

  ```javascript
  Ember.Handlebars.registerBoundHelper('repeat', function(value, options) {
    var count = options.hash.count;
    var a = [];
    while(a.length < count) {
        a.push(value);
    }
    return a.join('');
  });
  ```

  This helper could be used in a template as follows:

  ```handlebars
  {{repeat text count=3}}
  ```

  ## Example with bound options

  Bound hash options are also supported. Example:

  ```handlebars
  {{repeat text count=numRepeats}}
  ```

  In this example, count will be bound to the value of
  the `numRepeats` property on the context. If that property
  changes, the helper will be re-rendered.

  ## Example with extra dependencies

  The `Ember.Handlebars.registerBoundHelper` method takes a variable length
  third parameter which indicates extra dependencies on the passed in value.
  This allows the handlebars helper to update when these dependencies change.

  ```javascript
  Ember.Handlebars.registerBoundHelper('capitalizeName', function(value) {
    return value.get('name').toUpperCase();
  }, 'name');
  ```

  ## Example with multiple bound properties

  `Ember.Handlebars.registerBoundHelper` supports binding to
  multiple properties, e.g.:

  ```javascript
  Ember.Handlebars.registerBoundHelper('concatenate', function() {
    var values = Array.prototype.slice.call(arguments, 0, -1);
    return values.join('||');
  });
  ```

  Which allows for template syntax such as `{{concatenate prop1 prop2}}` or
  `{{concatenate prop1 prop2 prop3}}`. If any of the properties change,
  the helper will re-render.  Note that dependency keys cannot be
  using in conjunction with multi-property helpers, since it is ambiguous
  which property the dependent keys would belong to.

  ## Use with unbound helper

  The `{{unbound}}` helper can be used with bound helper invocations
  to render them in their unbound form, e.g.

  ```handlebars
  {{unbound capitalize name}}
  ```

  In this example, if the name property changes, the helper
  will not re-render.

  ## Use with blocks not supported

  Bound helpers do not support use with Handlebars blocks or
  the addition of child views of any kind.

  @method registerBoundHelper
  @for Ember.Handlebars
  @param {String} name
  @param {Function} function
  @param {String} dependentKeys*
*/
export function registerBoundHelper(name, fn) {
  var boundHelperArgs = slice.call(arguments, 1);
  var boundFn = makeBoundHelper.apply(this, boundHelperArgs);
  EmberHandlebars.registerHelper(name, boundFn);
}

/**
  A helper function used by `registerBoundHelper`. Takes the
  provided Handlebars helper function fn and returns it in wrapped
  bound helper form.

  The main use case for using this outside of `registerBoundHelper`
  is for registering helpers on the container:

  ```js
  var boundHelperFn = Ember.Handlebars.makeBoundHelper(function(word) {
    return word.toUpperCase();
  });

  container.register('helper:my-bound-helper', boundHelperFn);
  ```

  In the above example, if the helper function hadn't been wrapped in
  `makeBoundHelper`, the registered helper would be unbound.

  @method makeBoundHelper
  @for Ember.Handlebars
  @param {Function} function
  @param {String} dependentKeys*
  @since 1.2.0
*/
function makeBoundHelper(fn) {
  if (!SimpleBoundView) {
    SimpleBoundView = requireModule('ember-views/views/simple_bound_view')['default'];
  } // ES6TODO: stupid circular dep

  var dependentKeys = [];
  for (var i = 1; i < arguments.length; i++) {
    dependentKeys.push(arguments[i]);
  }

  function helper() {
    var numParams = arguments.length - 1;
    var options = arguments[numParams];
    var data = options.data;
    var view = data.view;
    var types = options.types;
    var hash = options.hash;
    var hashTypes = options.hashTypes;
    var context = this;

    Ember.assert("registerBoundHelper-generated helpers do not support use with Handlebars blocks.", !options.fn);

    var properties = new Array(numParams);
    var params = new Array(numParams);

    for (var i = 0; i < numParams; i++) {
      properties[i] = arguments[i];
      if (types[i] === 'ID') {
        params[i] = view.getStream(arguments[i]);
      } else {
        params[i] = arguments[i];
      }
    }

    for (var prop in hash) {
      if (IS_BINDING.test(prop)) {
        hash[prop.slice(0, -7)] = view.getStream(hash[prop]);
        hash[prop] = undefined;
      } else if (hashTypes[prop] === 'ID') {
        hash[prop] = view.getStream(hash[prop]);
      }
    }

    var valueFn = function() {
      var args = readArray(params);
      args.push({
        hash: readHash(hash),
        data: { properties: properties }
      });
      return fn.apply(context, args);
    };

    if (data.isUnbound) {
      return valueFn();
    } else {
      var lazyValue = new Stream(valueFn);
      var bindView = new SimpleBoundView(lazyValue, !options.hash.unescaped);
      view.appendChild(bindView);

      var scheduledRerender = view._wrapAsScheduled(bindView.rerender);
      lazyValue.subscribe(scheduledRerender, bindView);

      var param;

      for (i = 0; i < numParams; i++) {
        param = params[i];
        if (param && param.isStream) {
          param.subscribe(lazyValue.notify, lazyValue);
        }
      }

      for (prop in hash) {
        param = hash[prop];
        if (param && param.isStream) {
          param.subscribe(lazyValue.notify, lazyValue);
        }
      }

      if (numParams > 0) {
        var firstParam = params[0];
        // Only bother with subscriptions if the first argument
        // is a stream itself, and not a primitive.
        if (firstParam && firstParam.isStream) {
          var onDependentKeyNotify = function onDependentKeyNotify(stream) {
            stream.value();
            lazyValue.notify();
          };
          for (i = 0; i < dependentKeys.length; i++) {
            var childParam = firstParam.get(dependentKeys[i]);
            childParam.value();
            childParam.subscribe(onDependentKeyNotify);
          }
        }
      }
    }
  }

  return helper;
}

export {
  makeBoundHelper,
  handlebarsGetView,
  handlebarsGet
};
