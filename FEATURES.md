## About Features

Please read the [Feature Flag Guide](https://emberjs.com/guides/configuring-ember/feature-flags/)
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

* `ember-glimmer-named-arguments`

  Add `{{@foo}}` syntax to access named arguments in component templates per
  [RFC](https://github.com/emberjs/rfcs/pull/276).

* `ember-module-unification`

  Introduces support for Module Unification
  ([RFC](https://github.com/dgeb/rfcs/blob/module-unification/text/0000-module-unification.md))
  to Ember. This includes:

  - Passing the `source` of a `lookup`/`factoryFor` call as the second argument
    to an Ember resolver's `resolve` method (as a positional arg we will call
    `referrer`).
  - Making `lookupComponentPair` friendly to local/private resolutions. The
    new code ensures a local resolution is not paired with a global resolution.

  This feature is paired with the
  [`EMBER_RESOLVER_MODULE_UNIFICATION`](https://github.com/ember-cli/ember-resolver#ember_resolver_module_unification)
  flag on the ember-resolver package.
