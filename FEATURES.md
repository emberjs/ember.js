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

* `ember-testing-instances`

  Adds support for using ApplicationInstances in test helpers. Specifically,
  adds `Application#buildTestInstance` to create an instance and bind test
  helpers to it.

  Example:

  ```javascript
  var app = Ember.Application.create({ autoboot: false });

  // ...

  beforeEach() {
    this.instance = app.buildTestInstance();
  }

  // ...

  test('some test', function() {
    this.instance.testHelpers.visit('/url');
    this.instance.testHelpers.andThen(() => {
      // some assertion
    });
  });
  ```

* `ember-htmlbars-component-generation`

  Enables HTMLBars compiler to interpret `<x-foo></x-foo>` as a component
  invocation (instead of a standard HTML5 style element).

* `ember-debug-handlers`

  Implements RFC https://github.com/emberjs/rfcs/pull/65, adding support for
  custom deprecation and warning handlers.

* `ember-routing-routable-components`

  Implements RFC https://github.com/emberjs/rfcs/pull/38, adding support for
  routable components.

* `ember-metal-ember-assign`

  Add `Ember.assign` that is polyfill for `Object.assign`.

* `ember-contextual-components`

  Introduce a helper that creates closures over attrs and its own path, then
  allow the closed over cell to be invoked via the `{{component` helper or
  any reference with a dot in the path.

  For example:

  ```js
  {{#with (hash profile=(component "user-profile")) as |userComponents|}}
    {{userComponents.profile}}
  {{/with}}
  ```

  Implements RFC [#64](https://github.com/emberjs/rfcs/blob/master/text/0064-contextual-component-lookup.md)

* `ember-htmlbars-local-lookup`

  Provides the ability for component lookup to be relative to the source template.

  When the proper API's are implemented by the resolver in use this feature allows `{{x-foo}}` in a
  given routes template (say the `post` route) to lookup a component nested under `post`.
