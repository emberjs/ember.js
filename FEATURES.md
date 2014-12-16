## About Features

Please read the [Feature Flag Guide](http://emberjs.com/guides/configuring-ember/feature-flags/)
for a detailed explanation.

## Feature Flags

* `ember-metal-warn-on-undefined-get`

  When `Ember.ENV.WARN_ON_UNDEFINED_GET` is true:

  Warn when an undefined property is accessed via `Ember.get`. This
  feature is meant to expose typos in variable names sooner rather than
  later.

  Access to properties that are defined with an inital `null` value won't
  raise.

  For example:

  ```js
  Ember.ENV.WARN_ON_UNDEFINED_GET = true;

  var obj = Ember.Object.create({
    foo: null
  });

  obj.get("foo"); // => null
  obj.get("bar"); // => raises
  obj.get("foo.bar"); // => raises
  ```
  Added in [#9950](https://github.com/emberjs/ember.js/issues/9950).

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

* `ember-routing-will-change-hooks`
  Finer-grained `willTransition`-esque actions:

  - `willLeave`: fires on routes that will no longer be active after
    the transition
  - `willChangeModel`: fires on routes that will still be active
    but will re-resolve their models

  Both of these hooks act like willTransition in the sense that they
  give you an opportunity to abort the transition before it happens.
  Common use cases include animating things away or prompting to user
  to deal with unsaved changes.

  Added in [#4760](https://github.com/emberjs/ember.js/pull/4760)

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

* `ember-runtime-item-controller-inline-class`

  This feature allows you to specify a controller class inline for the `itemController`
  property of an `array controller`.

  Added in [#5301](https://github.com/emberjs/ember.js/pull/5301)

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
