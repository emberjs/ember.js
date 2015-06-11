/**
@module ember
@submodule ember-htmlbars
*/

import helpers from "ember-htmlbars/helpers";
import makeBoundHelper from "ember-htmlbars/compat/make-bound-helper";

var slice = [].slice;

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
  @param {Function} fn
  @param {String} dependentKeys*
  @private
*/
export default function registerBoundHelper(name, fn) {
  var boundHelperArgs = slice.call(arguments, 1);
  var boundFn = makeBoundHelper.apply(this, boundHelperArgs);

  helpers[name] = boundFn;
}
