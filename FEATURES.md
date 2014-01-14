## About Features

Please read the [Feature Flag Guide](http://emberjs.com/guides/configuring-ember/feature-flags/)
for a detailed explanation.

## Feature Flags

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

  Added in [#3953](https://github.com/emberjs/ember.js/pull/3953).

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

* `ember-metal-run-bind`

  Enables `Ember.run.bind` which is ember run-loop aware variation of
  jQuery.proxy.  Useful for integrating with 3rd party callbacks.

  Added in [161113](https://github.com/emberjs/ember.js/commit/161113a9e5fad7f6dfde09a053166a05660a0051).

* `ember-metal-is-blank`

  Adds `Ember.isBlank` method which returns true for an empty value or
  a whitespace string.

  Added in [#4049](https://github.com/emberjs/ember.js/pull/4049).  

* `ember-eager-url-update`

  Invoking (clicking) `link-to` tags will immediately update the URL
  instead of waiting for the transition to run to completion, unless
  the transition was aborted/redirected within the same run loop.

  Added in [#4122](https://github.com/emberjs/ember.js/pull/4122).

* `ember-application-ajax`
  Incorporates https://github.com/instructure/ic-ajax as an internal
  vendored package, and makes it available as `Ember.ajax`.

  Added in [#4148](https://github.com/emberjs/ember.js/pull/4148)

