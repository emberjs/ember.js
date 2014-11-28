/**
@module ember
@submodule ember-htmlbars
*/

var helpers = { };

/**
@module ember
@submodule ember-htmlbars
*/

import View from "ember-views/views/view";
import Component from "ember-views/views/component";
import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import Helper from "ember-htmlbars/system/helper";
import makeBoundHelper from "ember-htmlbars/system/make_bound_helper";

/**
  Register a bound helper or custom view helper.

  ## Simple bound helper example

  ```javascript
  Ember.HTMLBars.helper('capitalize', function(value) {
    return value.toUpperCase();
  });
  ```

  The above bound helper can be used inside of templates as follows:

  ```handlebars
  {{capitalize name}}
  ```

  In this case, when the `name` property of the template's context changes,
  the rendered value of the helper will update to reflect this change.

  For more examples of bound helpers, see documentation for
  `Ember.HTMLBars.registerBoundHelper`.

  ## Custom view helper example

  Assuming a view subclass named `App.CalendarView` were defined, a helper
  for rendering instances of this view could be registered as follows:

  ```javascript
  Ember.HTMLBars.helper('calendar', App.CalendarView):
  ```

  The above bound helper can be used inside of templates as follows:

  ```handlebars
  {{calendar}}
  ```

  Which is functionally equivalent to:

  ```handlebars
  {{view 'calendar'}}
  ```

  Options in the helper will be passed to the view in exactly the same
  manner as with the `view` helper.

  @method helper
  @for Ember.HTMLBars
  @param {String} name
  @param {Function|Ember.View} function or view class constructor
*/
export function helper(name, value) {
  Ember.assert("You tried to register a component named '" + name +
               "', but component names must include a '-'", !Component.detect(value) || name.match(/-/));

  if (View.detect(value)) {
    helpers[name] = makeViewHelper(value);
  } else {
    registerBoundHelper(name, value);
  }
}

/**
  @private
  @method registerHelper
  @for Ember.HTMLBars
  @param {String} name
  @param {Function} helperFunc the helper function to add
*/
export function registerHelper(name, helperFunc, preprocessFunction) {
  helpers[name] = new Helper(helperFunc, preprocessFunction);
}

/**
  Register a bound helper. Bound helpers behave similarly to regular
  helpers, with the added ability to re-render when the underlying data
  changes.

  ## Simple example

  ```javascript
  Ember.HTMLBars.registerBoundHelper('capitalize', function(params, hash, options, env) {
    return Ember.String.capitalize(params[0]);
  });
  ```

  The above bound helper can be used inside of templates as follows:

  ```handlebars
  {{capitalize name}}
  ```

  In this case, when the `name` property of the template's context changes,
  the rendered value of the helper will update to reflect this change.

  ## Example with hash parameters

  Like normal helpers, bound helpers have access to the hash parameters
  passed into the helper call.

  ```javascript
  Ember.HTMLBars.registerBoundHelper('repeat', function(params, hash) {
    var count = hash.count;
    var value = params[0];

    return new Array( count + 1).join( value );
  });
  ```

  This helper could be used in a template as follows:

  ```handlebars
  {{repeat text count=3}}
  ```

  ## Example with bound hash parameters

  Bound hash params are also supported. Example:

  ```handlebars
  {{repeat text count=numRepeats}}
  ```

  In this example, count will be bound to the value of
  the `numRepeats` property on the context. If that property
  changes, the helper will be re-rendered.

  ## Example with multiple bound properties

  `Ember.HTMLBars.registerBoundHelper` supports binding to
  multiple properties, e.g.:

  ```javascript
  Ember.HTMLBars.registerBoundHelper('concatenate', function(params) {
    return params.join('||');
  });
  ```

  Which allows for template syntax such as `{{concatenate prop1 prop2}}` or
  `{{concatenate prop1 prop2 prop3}}`. If any of the properties change,
  the helper will re-render.

  ## Use with unbound helper

  The `{{unbound}}` helper can be used with bound helper invocations
  to render them in their unbound form, e.g.

  ```handlebars
  {{unbound capitalize name}}
  ```

  In this example, if the name property changes, the helper
  will not re-render.

  ## Use with blocks not supported

  Bound helpers do not support use with blocks or the addition of
  child views of any kind.

  @private
  @method registerBoundHelper
  @for Ember.HTMLBars
  @param {String} name
  @param {Function} function
*/
export function registerBoundHelper(name, fn) {
  var boundFn = makeBoundHelper(fn);

  helpers[name] = boundFn;
}

export default helpers;
