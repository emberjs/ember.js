## About Features

Please read the [Feature Flag Guide](http://emberjs.com/guides/configuring-ember/feature-flags/)
for a detailed explanation.

## Feature Flags

* `reduceComputed-non-array-dependencies`

  `ReduceComputedProperty`s may have non-array dependent keys.  When a non-array
  dependent key changes, the entire property is invalidated.

  Array dependent keys may be specified with either one-at-a-time semantics or
  total invalidation semantics.  Property names like `'dependentArray'` use
  one-at-a-time semantics; property names like `'dependentArray.[]'` use total
  invalidation semantics.

  This can be useful for example, for filtering.  The items to be filtered
  should use one-a-time semantics, but the properties to filter by should use
  total invalidation semantics.

  Added in [#3614](https://github.com/emberjs/ember.js/pull/3614).

* `propertyBraceExpansion`

  Adds support for brace-expansion in dependent keys, observer, and watch properties.
  (E.g. `Em.computed.filter('list.@each.{propA,propB}', filterFn)` which will observe both
  `propA` and `propB`).

  Added in [#3538](https://github.com/emberjs/ember.js/pull/3538).
* `string-humanize`

  Replaces underscores with spaces, and capitializes first character of string.
  Also strips `_id` suffixes. (E.g. `'first_name'.humanize() // 'First name'`)

  Added in [#3224](https://github.com/emberjs/ember.js/pull/3224)
* `string-parameterize`

  Transforms a string so that it may be used as part of a 'pretty' / SEO friendly URL.
  (E.g. `'100 ways Ember.js is better than Angular.'.parameterize(); // '100-ways-emberjs-is-better-than-angular'`)

* `ember-testing-wait-hooks`

  Allows registration of additional functions that the `wait` testing helper
  will call to determine if it's ready to continue.

  Added in [#3433](https://github.com/emberjs/ember.js/pull/3433)
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

* `ember-testing-lazy-routing`

  Uses an initializer to defer readiness while testing. Readiness is advanced upon the first
  call to `visit`.

  NOTE: This causes `App.reset()` to behave consistently with the way an app works after calling
  `setupForTesting` (i.e. in a deferred state of readiness).

  Added in [#3695](https://github.com/emberjs/ember.js/pull/3695).

* `ember-handlebars-caps-lookup`
  Forces Handlebars values starting with capital letters, like `{{CONSTANT}}`,
  to always be looked up on `Ember.lookup`. Previously, these values would be
  looked up on the controller in certain cases.

  Added in [#3218](https://github.com/emberjs/ember.js/pull/3218)

* `ember-testing-simple-setup`
  Removes the need for most of the ceremony of setting up an application for testing. The following
  examples are equivalent:

  Ember 1.0.0 testing setup:

  ```javascript
  App = Ember.Application.create();
  App.setupForTesting();
  App.injectTestHelpers();
  ```

  New simple setup:

  ```javascript
  App = Ember.Application.create({testing: true});
  ```

  Added in [#3785](https://github.com/emberjs/ember.js/pull/3785).

* `ember-testing-routing-helpers`

  Adds `currentRouteName`, `currentPath`, and `currentURL` testing helpers.

  Added in [#3711](https://github.com/emberjs/ember.js/pull/3711).

* `ember-testing-triggerEvent-helper`

  Adds `triggerEvent` testing helper to allow triggering of arbitrary events on an
  element.

  Added in [#3792](https://github.com/emberjs/ember.js/pull/3792).

* `with-controller`

  Enables `{{#with}}` to take a `controller=` option for wrapping the context.

  Added in [#3722](https://github.com/emberjs/ember.js/pull/3722)


* `computed-read-only`

  Enables `Ember.computed.readOnly` which is the shortHand for
  Ember.computed.oneWay('foo').readOnly().

  Added in [#3879](https://github.com/emberjs/ember.js/pull/3879)

* `query-params-new`

  Add query params support to the ember router. This is a rewrite of a
  previous attempt at an API for query params. You can define query
  param properties on route-driven controllers with the `queryParams`
  property, and any changes to those properties will cause the URL
  to update, and in the other direction, any URL changes to the query
  params will cause those controller properties to update.

  Added in [#4008](https://github.com/emberjs/ember.js/pull/4008).
