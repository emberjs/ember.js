## About Features

Please read the [Feature Flag Guide](http://emberjs.com/guides/configuring-ember/feature-flags/)
for a detailed explanation.

## Feature Flags

* `ember-libraries-isregistered`

  Add `isRegistered` to `Ember.libraries`. This convenience method checks whether
  a library is registered with Ember or not.

* `ember-routing-core-outlet`

  Provides a non-virtual version of OutletView named
  CoreOutletView. You would use CoreOutletView just like you're use
  OutletView: by extending it with whatever behavior you want and then
  passing it to the `{{outlet}}` helper's `view` property.

  The only difference between them is that OutletView has no element
  of its own (it is a "virtual" view), whereas CoreOutletView has an
  element.

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

* `ember-metal-stream`

  Exposes the basic internal stream implementation as `Ember.Stream`.

  Added in [#9693](https://github.com/emberjs/ember.js/pull/9693)

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

* `ember-router-willtransition`

  Adds `willTransition` hook to `Ember.Router`. For example,

  ```js
  Ember.Router.extend({
    onBeforeTransition: function(transition) {
      //doSomething
    }.on('willTransition')
  });
  ```

  Added in [#10274](https://github.com/emberjs/ember.js/pull/10274)


* `ember-routing-htmlbars-improved-actions`

  Using the `(action` subexpression, allow for the creation of closure-wrapped
  callbacks to pass into downstream components. The returned value of
  the `(action` subexpression (or `submit={{action 'save'}}` style subexpression)
  is a function. mut objects expose an `INVOKE` interface making them
  compatible with action subexpressions.

  Per RFC [#50](https://github.com/emberjs/rfcs/pull/50)

* `ember-htmlbars-get-helper`

  The Syntax: `{{get object path}}`

  A new keyword/helper that can be used to allow your object and/or key
  values to be dynamic.

  Example:
  ```js

  context = {
    displayedPropertyTitle: 'First Name',
    displayedPropertyKey: 'firstName'
  };
  ```

  ```hbs
  <h2>{{displayedPropertyTitle}}</h2>

  <ul>
  {{#each people as |person|}}
    <li>{{get person displayedPropertyKey}}</li>
  {{/each}}
  </ul>
  ```

  This allows the template to provide `displayedPropertyTitle`
  and `displayedPropertyKey` to render a list for a single property
  for each person.. E.g. a list of all `firstNames`, or `lastNames`, or `ages`.

  Addd in [#11196](https://github.com/emberjs/ember.js/pull/11196)

* `ember-htmlbars-helper`

  Implements RFC https://github.com/emberjs/rfcs/pull/53, a public helper
  api.

* `ember-htmlbars-dashless-helpers`

  Implements RFC https://github.com/emberjs/rfcs/pull/58, adding support for
  dashless helpers.

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
