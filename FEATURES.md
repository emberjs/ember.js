## About Features

Please read the [Feature Flag Guide](http://emberjs.com/guides/configuring-ember/feature-flags/)
for a detailed explanation.

## Feature Flags

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

* `ember-handlebars-caps-lookup`
  Forces Handlebars values starting with capital letters, like `{{CONSTANT}}`,
  to always be looked up on `Ember.lookup`. Previously, these values would be
  looked up on the controller in certain cases.

  Added in [#3218](https://github.com/emberjs/ember.js/pull/3218)

* `composable-computed-properties`

  This feature allows you to combine (compose) different computed
  properties together. So it gives you a really nice "functional
  programming" like syntax to deal with complex expressions.

  Added in [#3696](https://github.com/emberjs/ember.js/pull/3696).

* `query-params-new`

  Add query params support to the ember router. This is a rewrite of a
  previous attempt at an API for query params. You can define query
  param properties on route-driven controllers with the `queryParams`
  property, and any changes to those properties will cause the URL
  to update, and in the other direction, any URL changes to the query
  params will cause those controller properties to update.

  Added in [#4008](https://github.com/emberjs/ember.js/pull/4008).

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
