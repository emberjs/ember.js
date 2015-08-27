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

* `ember-testing-checkbox-helpers`

  Add `check` and `uncheck` test helpers.

  `check`:

  Checks a checkbox. Ensures the presence of the `checked` attribute

  Example:

  ```javascript
  check('#remember-me').then(function() {
    // assert something
  });
  ```

  `uncheck`:

  Unchecks a checkbox. Ensures the absence of the `checked` attribute

  Example:

  ```javascript
  uncheck('#remember-me').then(function() {
    // assert something
  });
  ```

* `ember-htmlbars-component-generation`

  Enables HTMLBars compiler to interpret `<x-foo></x-foo>` as a component
  invocation (instead of a standard HTML5 style element).

* `ember-htmlbars-each-with-index`

  Adds an optional second parameter to `{{each}}` block parameters that is the index of the item.

  For example,

  ```handlebars
  <ul>
    {{#each people as |person index|}}
       <li>{{index}}) {{person.name}}</li>
    {{/each}}
  </ul>
  ```

  Added in [#10160](https://github.com/emberjs/ember.js/pull/10160)

* `ember-debug-handlers`

  Implemencts RFC https://github.com/emberjs/rfcs/pull/65, adding support for
  custom deprecation and warning handlers.

* `ember-registry-container-reform`

  Implements RFC https://github.com/emberjs/rfcs/pull/46, fully encapsulating
  and privatizing the `Container` and `Registry` classes by exposing a select
  subset of public methods on `Application` and `ApplicationInstance`.

  `Application` initializers now receive a single argument to `initialize`:
  `application`.

  Likewise, `ApplicationInstance` initializers still receive a single argument
  to initialize: `applicationInstance`.

* `ember-routing-routable-components`

  Implements RFC https://github.com/emberjs/rfcs/pull/38, adding support for
  routable components.

* `ember-improved-instrumentation`

  Adds additional instrumentation to Ember:

  - `interaction.<event-name>` for events handled by a component.
  - `interaction.ember-action` for closure actions.
  - `routing.transition.url` for transitions to a URL.
  - `routing.transition.named` for transitions to a named route.
