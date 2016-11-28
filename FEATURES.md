## About Features

Please read the [Feature Flag Guide](http://emberjs.com/guides/configuring-ember/feature-flags/)
for a detailed explanation.

## Feature Flags

* `ember-libraries-isregistered`

  Add `isRegistered` to `Ember.libraries`. This convenience method checks whether
  a library is registered with Ember or not.

* `ember-improved-instrumentation`

  Adds additional instrumentation to Ember:

  - `interaction.<event-name>` for events handled by a component.
  - `interaction.ember-action` for closure actions.
  - `interaction.link-to` for link-to execution.

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
  handled before continuing the test. Replaces the intimate API `Ember.Test.waiters` (with a deprecation).

* `ember-testing-resume-test`

  Introduces the `resumeTest` testing helper to complement the `pauseTest` helper.
