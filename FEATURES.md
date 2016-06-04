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

* `ember-runtime-enumerable-includes`

Deprecates `Enumerable#contains` and `Array#contains` in favor of `Enumerable#includes` and `Array#includes` 
to stay in line with ES standards (see [RFC](https://github.com/emberjs/rfcs/blob/master/text/0136-contains-to-includes.md)).
