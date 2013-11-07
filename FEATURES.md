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

* `container-renderables`

  Components and helpers registered on the container can be rendered in templates
  via their dasherized names. (E.g. {{helper-name}} or {{component-name}})

  Added in [#3329](https://github.com/emberjs/ember.js/pull/3329).
* `query-params`

  Add query params support to the ember router. You can now define which query
  params your routes respond to, use them in your route hooks to affect model
  loading or controller state, and transition query parameters with the link-to
  helper and the transitionTo method.

  Added in [#3182](https://github.com/emberjs/ember.js/pull/3182).
* `link-to-non-block`

  Add a non-block form link-to helper. E.g {{link-to "About us" "about"}} will
  have "About us" as link text and will transition to the "about" route. Everything
  works as with the block form link-to.

  Added in [#3443](https://github.com/emberjs/ember.js/pull/3443).
* `ember-routing-didTransition-hook`

  Add `didTransition` hook to the router that gets triggered for each route transition.

  Added in [#3452](https://github.com/emberjs/ember.js/pull/3452).
* `propertyBraceExpansion`

  Adds support for brace-expansion in dependent keys, observer, and watch properties.
  (E.g. `Em.computed.filter('list.@each.{propA,propB}', filterFn)` which will observe both
  `propA` and `propB`).

  Added in [#3538](https://github.com/emberjs/ember.js/pull/3538).
* `reduceComputedSelf`

  Dependent keys may refer to `@this` to observe changes to the object itself,
  which must be array-like, rather than a property of the object.  This is
  mostly useful for array proxies.

  Added in [#3365](https://github.com/emberjs/ember.js/pull/3365).
* `string-humanize`

  Replaces underscores with spaces, and capitializes first character of string.
  Also strips `_id` suffixes. (E.g. `'first_name'.humanize() // 'First name'`)

  Added in [#3224](https://github.com/emberjs/ember.js/pull/3224)
* `ember-runtime-sortBy`

  Adds `sortBy` to `Ember.Enumerable`. Allows sorting an enumerable by one or more
  properties.

  Added in [#3446](https://github.com/emberjs/ember.js/pull/3446)
* `ember-testing-wait-hooks`

  Allows registration of additional functions that the `wait` testing helper
  will call to determine if it's ready to continue.

  Added in [#3433](https://github.com/emberjs/ember.js/pull/3433)
* `ember-routing-loading-error-substates`

  Adds support for nested loading/error substates. A loading substate will be entered when a
  slow-to-resolve promise is returned from one of the Route#model hooks during a transition
  and an appropriately-named loading template/route can be found.  An error substate will be
  entered when one of the Route#model hooks returns a rejecting promise and an appropriately-named
  error template/route can be found.

  Added in [#3568](https://github.com/emberjs/ember.js/pull/3568) and feature
  flagged in [#3617](https://github.com/emberjs/ember.js/pull/3617).

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
