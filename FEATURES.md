## About Features

Please read the [Feature Flag Guide](http://emberjs.com/guides/configuring-ember/feature-flags/)
for a detailed explanation.

## Feature Flags

* `ember-routing-named-substates`

  Add named substates; e.g. when resolving a `loading` or `error`
  substate to enter, Ember will take into account the name of the
  immediate child route that the `error`/`loading` action originated
  from, e.g. 'foo' if `FooRoute`, and try and enter `foo_error` or
  `foo_loading` if it exists. This also adds the ability for a
  top-level `application_loading` or `application_error` state to
  be entered for `loading`/`error` events emitted from
  `ApplicationRoute`.

  Added in [#3655](https://github.com/emberjs/ember.js/pull/3655).

* `ember-handlebars-caps-lookup`
  Forces Handlebars values starting with capital letters, like `{{CONSTANT}}`,
  to always be looked up on `Ember.lookup`. Previously, these values would be
  looked up on the controller in certain cases.

  Added in [#3218](https://github.com/emberjs/ember.js/pull/3218)

* `composable-computed-properties`

  This feature allows you to combine (compose) different computed
  properties together. So it gives you a really nice "functional
  programming" like syntax to deal with complex expressions.

  Added in [#3696](https://github.com/emberjs/ember.js/pull/3696).

* `query-params-new`

  Add query params support to the ember router. This is a rewrite of a
  previous attempt at an API for query params. You can define query
  param properties on route-driven controllers with the `queryParams`
  property, and any changes to those properties will cause the URL
  to update, and in the other direction, any URL changes to the query
  params will cause those controller properties to update.

  Added in [#4008](https://github.com/emberjs/ember.js/pull/4008).

* `ember-runtime-test-friendly-promises`
  Ember.RSVP.Promise's are now ember testing aware

  - they no longer cause autorun assertions
  - if a test adapter is provided, they still automatically tell the
    underlying test framework to start/stop between async steps.

  Added in [#4176](https://github.com/emberjs/ember.js/pull/4176)

* `ember-routing-custom-link-view`

  Allow usage of a custom view class from the `link-to` helper. This allows easier
  customization of things like `classNameBindings`, `attributeBindings`, `active` state, etc
  without having to reopen the core `Ember.LinkView` class.

  Example:

  ```handlebars
  {{#link-to 'post' view="alternate-active"}}Post{{/link-to}}
  ```

  ```javascript
  App.AlternateActiveView = Ember.LinkView.extend({
    target: Ember.computed.alias('controller'),
    active: Ember.computed('resolvedParams', 'routeArgs', function(){
      var isActive = this._super();

      this.send('active', isActive);

      return isActive;
    })
  });
  ```

  This would send an `active` action when the views active/inactive state changes. If you
  couple this with a component you very easily handle having a parent DOM element receive
  an active class (think link-to nested inside an li for example).

  Functional example: http://emberjs.jsbin.com/juzay/2/edit

  Added in [#4647](https://github.com/emberjs/ember.js/pull/4647).
