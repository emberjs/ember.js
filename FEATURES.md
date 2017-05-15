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

* `ember-testing-resume-test`

  Introduces the `resumeTest` testing helper to complement the `pauseTest` helper.

* `glimmer-custom-component-manager`

  Adds an ability to for developers to integrate their own custom component managers
  into Ember Applications per [RFC](https://github.com/emberjs/rfcs/blob/custom-components/text/0000-custom-components.md).
