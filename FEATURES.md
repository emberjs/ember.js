## About Features

Please read the [Feature Flag Guide](http://emberjs.com/guides/configuring-ember/feature-flags/)
for a detailed explanation.

## Feature Flags

* `ember-libraries-isregistered`

  Add `isRegistered` to `Ember.libraries`. This convenience method checks whether
  a library is registered with Ember or not.

* `ember-routing-routable-components`

  Implements RFC https://github.com/emberjs/rfcs/pull/38, adding support for
  routable components.

* `ember-metal-ember-assign`

  Add `Ember.assign` that is polyfill for `Object.assign`.

* `ember-htmlbars-local-lookup`

  Provides the ability for component lookup to be relative to the source template.

  When the proper API's are implemented by the resolver in use this feature allows `{{x-foo}}` in a
  given routes template (say the `post` route) to lookup a component nested under `post`.

* `ember-test-helpers-fire-native-events`

  Makes ember test helpers (`fillIn`, `click`, `triggerEvent` ...) fire native javascript events instead
  of `jQuery.Event`s, maching more closely app's real usage.

* `ember-route-serializers`

  Deprecates `Route#serialize` and introduces a `serialize` option to the router DSL as a replacement (as per the [Route Serializers RFC](https://github.com/emberjs/rfcs/blob/master/text/0120-route-serializers.md)).

* `ember-runtime-computed-uniq-by`

  Introduces a computed and enumerable method "uniqBy" that allows creation of a new enumerable with unique values as  determined by the given property key.

  Example:

  ```
  comments: [
    {id: 1, comment: 'I\'m a duplicate comment!'},
    {id: 2, comment: 'Then you should be fixed!'},
    {id: 1, comment: 'I\'m a duplicate comment!'}
  ],
  dedupedComments: Ember.computed.uniqBy('comments', 'id')
  ```

* `ember-improved-instrumentation`

  Adds additional instrumentation to Ember:

  - `interaction.<event-name>` for events handled by a component.
  - `interaction.ember-action` for closure actions.
  - `interaction.link-to` for link-to execution.
