## About Features

Please read the [Feature Flag Guide](http://emberjs.com/guides/configuring-ember/feature-flags/)
for a detailed explanation.

## Feature Flags

* `ember-libraries-isregistered`

  Add `isRegistered` to `Ember.libraries`. This convenience method checks whether
  a library is registered with Ember or not.

* `ember-application-visit`

  Provides an API for creating an application instance and specifying
  an initial URL that it should route to. This is useful for testing
  (you can have multiple instances of an app without having to run
  serially and call `reset()` each time), as well as being critical to
  for FastBoot.

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