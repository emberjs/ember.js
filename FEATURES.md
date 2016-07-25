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

* `ember-string-ishtmlsafe`

  Introduces an API to detect if strings are decorated as htmlSafe. Example:

  ```javascript
  var plainString = 'plain string',
      safeString = Ember.String.htmlSafe('<div>someValue</div>');

  Ember.String.isHTMLSafe(plainString); // false
  Ember.String.isHTMLSafe(safeString);  // true
  ```

* `ember-testing-check-waiters`

Expose a simple mechanism for test tooling to determine if all foreign async has been
handled before continueing the test. Replaces the intimate API `Ember.Test.waiters` (with a deprecation).

* `ember-computed-includes`

  Introduces a new macro for Ember.computed to detect if an array includes a given element. Example:

  ```javascript
  let Hamster = Ember.Object.extend({
    hasABanana: Ember.computed.includes('possessions', 'banana')
  });

  let hamster = Hamster.create();

  hamster.get('hasABanana'); // false
  hamster.set('possessions', ['orange']);
  hamster.get('hasABanana'); // false
  hamster.set('possessions', ['banana']);
  hamster.get('hasABanana'); // true
  ```
