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

* `ember-metal-es5-getters`

  Define ES5 getters for computed properties, eliminating the need to access them
  using `Ember.get()`. See [RFC](https://github.com/emberjs/rfcs/pull/281).

* `ember-module-unification`

  Introduces support for Module Unification
  ([RFC](https://github.com/dgeb/rfcs/blob/module-unification/text/0000-module-unification.md))
  to Ember. This includes:

  - Passing the `source` of a `lookup`/`factoryFor` call as an argument to
    `expandLocalLookup` on the resolver.
  - Making `lookupComponentPair` friendly to local/private resolutions. The
    new code ensures a local resolution is not paired with a global resolution.

  This feature is paired with the
  [`EMBER_RESOLVER_MODULE_UNIFICATION`](https://github.com/ember-cli/ember-resolver#ember_resolver_module_unification)
  flag on the ember-resolver package.

* `ember-template-block-let-helper`

  Introduce the block form of the `let` helper per [RFC](https://github.com/emberjs/rfcs/blob/78211b11387e7f477264e322687f1ec5ab131361/text/0286-block-let-template-helper.md).
