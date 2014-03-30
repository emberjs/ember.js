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

* `ember-routing-auto-location`

  Adds `auto` as a `location` option for the app's `Router`.

  ```javascript
  App.Router.reopen({
    location: 'auto'
  });
  ```

  When used, Ember will select the best location option based off browser
  support with the priority order: history, hash, none.

  Clean pushState paths accessed by hashchange-only browsers will be redirected
  to the hash-equivalent and vice versa so future transitions look consistent.

  Added in [#3725](https://github.com/emberjs/ember.js/pull/3725).

* `ember-routing-bound-action-name`

  Enables using a bound property lookup to determine the action name to
  be fired.

  Added in [#3936](https://github.com/emberjs/ember.js/pull/3936)

* `ember-runtime-test-friendly-promises`
  Ember.RSVP.Promise's are now ember testing aware

  - they no longer cause autorun assertions
  - if a test adapter is provided, they still automatically tell the
    underlying test framework to start/stop between async steps.

  Added in [#4176](https://github.com/emberjs/ember.js/pull/4176)
  
* `ember-routing-inherits-parent-model`

  Ember routes and leaf resources (without nested routes) will inherit the parent route's model.
  
  Added in [#4246](https://github.com/emberjs/ember.js/pull/4246)
