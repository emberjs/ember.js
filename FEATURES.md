## About Features

Please read the [Feature Flag Guide](http://emberjs.com/guides/configuring-ember/feature-flags/)
for a detailed explanation.

## Feature Flags

* `ember-application-instance-initializers`

  Splits apart initializers into two phases:

  * Boot-time Initializers that receive a registry, and use it to set up
    code structures
  * Instance Initializers that receive an application instance, and use
    it to set up application state per run of the application.

  In FastBoot, each request will have its own run of the application,
  and will only need to run the instance initializers.

  In the future, tests will also be able to use this differentiation to
  run just the instance initializers per-test.

  With this change, `App.initializer` becomes a "boot-time" initializer,
  and issues a deprecation warning if instances are accessed.

  Apps should migrate any initializers that require instances to the new
  `App.instanceInitializer` API.

* `ember-application-initializer-context`

  Sets the context of the initializer function to its object instead of the
  global object.

  Added in [#10179](https://github.com/emberjs/ember.js/pull/10179).

* `ember-testing-checkbox-helpers`

  Add `check` and `uncheck` test helpers.

  `check`:

  Checks a checkbox. Ensures the presence of the `checked` attribute

  Example:

  ```javascript
  check('#remember-me').then(function() {
    // assert something
  });
  ```

  `uncheck`:

  Unchecks a checkbox. Ensures the absence of the `checked` attribute

  Example:

  ```javascript
  uncheck('#remember-me').then(function() {
    // assert something
  });
  ```

* `ember-routing-named-substates`

  Add named substates; e.g. when resolving a `loading` or `error`
  substate to enter, Ember will take into account the name of the
  immediate child route that the `error`/`loading` action originated
  from, e.g. 'foo' if `FooRoute`, and try and enter `foo_error` or
  `foo_loading` if it exists. This also adds the ability for a
  top-level `application_loading` or `application_error` state to
  be entered for `loading`/`error` events emitted from
  `ApplicationRoute`.

  Added in [#3655](https://github.com/emberjs/ember.js/pull/3655).

* `composable-computed-properties`

  This feature allows you to combine (compose) different computed
  properties together. So it gives you a really nice "functional
  programming" like syntax to deal with complex expressions.

  Added in [#3696](https://github.com/emberjs/ember.js/pull/3696).

* `ember-metal-is-present`

  Adds `Ember.isPresent` as the inverse of `Ember.isBlank`. This convenience
  method can lead to more semantic and clearer code.

  Added in [#5136](https://github.com/emberjs/ember.js/pull/5136)

* `property-brace-expansion-improvement`

  Property brace expansion now allows multiple sets of braces to be used,
  as well as not restricting their location in the string.

  Added in [#4617](https://github.com/emberjs/ember.js/pull/4617)

* `ember-routing-multi-current-when`

  Allows the `link-to` helper's currentWhen property to accept multiple routes
  using a ` ` (space) delimiter, for more control over a link's active state.

  Added in [#3673](https://github.com/emberjs/ember.js/pull/3673)

* `ember-routing-fire-activate-deactivate-events`

  Fire `activate` and `deactivate` events, additionally to the corresponding
  `Ember.Route` hooks.

  Added in [#5569](https://github.com/emberjs/ember.js/pull/5569)

* `ember-testing-pause-test`

  Helper to pause a test, for use in debugging and TDD.

  Added in [#9383](https://github.com/emberjs/ember.js/pull/9383)

* `ember-htmlbars-component-generation`

  Enables HTMLBars compiler to interpret `<x-foo></x-foo>` as a component
  invocation (instead of a standard HTML5 style element).

* `ember-htmlbars-inline-if-helper`

  Enables the use of the if helper in inline form. The truthy
  and falsy values are passed as params, instead of using the block form.

  Added in [#9718](https://github.com/emberjs/ember.js/pull/9718).

* `ember-htmlbars-attribute-syntax`

  Adds the `class="{{color}}"` syntax to Ember HTMLBars templates.
  Works with arbitrary attributes and properties.

  Added in [#9721](https://github.com/emberjs/ember.js/pull/9721).

* `ember-metal-injected-properties`

  Enables the injection of properties onto objects coming from a container,
  and adds the `Ember.Service` class.  Use the `Ember.inject.service` method to
  inject services onto any object, or `Ember.inject.controller` to inject
  controllers onto any other controller. The first argument to `Ember.inject`
  methods is optional, and if left blank the key of the property will be used
  to perform the lookup instead.  Replaces the need for `needs` in controllers.

  Added in [#5162](https://github.com/emberjs/ember.js/pull/5162).

* `ember-routing-transitioning-classes`

  Disables eager URL updates during slow transitions in favor of new CSS
  classes added to `link-to`s (in addition to `active` class):

  - `ember-transitioning-in`: link-to is not currently active, but will be
    when the current underway (slow) transition completes.
  - `ember-transitioning-out`: link-to is currently active, but will no longer
    be active when the current underway (slow) transition completes.

  Added in [#9919](https://github.com/emberjs/ember.js/pull/9919)

* `new-computed-syntax`

  Enables the new computed property syntax. In this new syntax, instead of passing
  a function that acts both as getter and setter for the property, `Ember.computed`
  receives an object with `get` and `set` keys, each one containing a function.

  For example,

  ```js
  visible: Ember.computed('visibility', {
    get: function(key) {
      return this.get('visibility') !== 'hidden';
    },
    set: function(key, boolValue) {
      this.set('visibility', boolValue ? 'visible' : 'hidden');
      return boolValue;
    }
  })
  ```

  If the object does not contain a `set` key, the property will simply be overridden.
  Passing just function is still supported, and is equivalent to passing only a getter.

  Added in [#9527](https://github.com/emberjs/ember.js/pull/9527).

* `ember-metal-stream`

  Exposes the basic internal stream implementation as `Ember.Stream`.

  Added in [#9693](https://github.com/emberjs/ember.js/pull/9693)

* `ember-htmlbars-each-with-index`

  Adds an optional second parameter to `{{each}}` block parameters that is the index of the item.

  For example,

  ```handlebars
  <ul>
    {{#each people as |person index|}}
       <li>{{index}}) {{person.name}}</li>
    {{/each}}
  </ul>
  ```

  Added in [#10160](https://github.com/emberjs/ember.js/pull/10160)

* `ember-router-willtransition`

  Adds `willTransition` hook to `Ember.Router`. For example:

  ```js
  Ember.Router.extend({
    onBeforeTransition: function(transition) {
      //doSomething
    }.on('willTransition')
  });
  ```

  Added in [#10274](https://github.com/emberjs/ember.js/pull/10274)