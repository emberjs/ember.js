## About Features

As of Ember 1.0.0 we have started using a new release process. At this point all
newly added features will be behind a feature flag. This allows changes being
made to be enabled or disabled at runtime for each application.

This processes is explained in more detail [here](http://emberjs.com/blog/2013/09/06/new-ember-release-process.html).

## How do I use them?

There are a couple different ways to enable a given feature.

Declare an `ENV.FEATURES` global before requiring Ember:

```javascript
ENV = {FEATURES: {'link-to': true}};
```

Set the `Ember.FEATURES` value after initialization:

```javascript
Ember.FEATURES['link-to'] = true;
```

## Feature Flags

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

  Dependent keys may refer to `@self` to observe changes to the object itself,
  which must be array-like, rather than a property of the object.  This is
  mostly useful for array proxies.

  Added in [#3365](https://github.com/emberjs/ember.js/pull/3365).
* `string-humanize`

  Replaces underscores with spaces, and capitializes first character of string.
  Also strips `_id` suffixes. (E.g. `'first_name'.humanize() // 'First name'`)

  Added in [#3224](https://github.com/emberjs/ember.js/pull/3224)
* `ember-runtime-sortBy`

  Adds `sortBy` to `Ember.Enumberable`. Allows sorting an enumerable by one or more
  properties.

  Added in [#3446](https://github.com/emberjs/ember.js/pull/3446)
* `em-o`

  Adds `Em.O` function as a shorthand for `Ember.Object.create`.
  
  Added in [#3370](https://github.com/emberjs/ember.js/pull/3370)
* `ember-testing-wait-hooks`

  Allows registration of additional functions that the `wait` testing helper
  will call to determine if it's ready to continue.

  Added in [#3433](https://github.com/emberjs/ember.js/pull/3433)
