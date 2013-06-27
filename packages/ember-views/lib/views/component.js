require("ember-views/views/view");

/**
@module ember
@submodule ember-views
*/

/**
  An `Ember.Component` is a view that is completely
  isolated. Property access in its templates go
  to the view object and actions are targeted at
  the view object. There is no access to the
  surrounding context or outer controller; all
  contextual information is passed in.

  The easiest way to create an `Ember.Component` is via
  a template. If you name a template
  `components/my-foo`, you will be able to use
  `{{my-foo}}` in other templates, which will make
  an instance of the isolated component.

  ```html
  {{app-profile person=currentUser}}
  ```

  ```html
  <!-- app-profile template -->
  <h1>{{person.title}}</h1>
  <img {{bindAttr src=person.avatar}}>
  <p class='signature'>{{person.signature}}</p>
  ```

  You can also use `yield` inside a template to
  include the **contents** of the custom tag:

  ```html
  {{#app-profile person=currentUser}}
    <p>Admin mode</p>
  {{/app-profile}}
  ```

  ```html
  <!-- app-profile template -->
  <h1>{{person.title}}</h1>
  {{yield}} <!-- block contents -->
  ```

  If you want to customize the component, in order to
  handle events or actions, you implement a subclass
  of `Ember.Component` named after the name of the
  component.

  For example, you could implement the action
  `hello` for the `app-profile` component:

  ```js
  App.AppProfileComponent = Ember.Component.extend({
    hello: function(name) {
      console.log("Hello", name)
    }
  });
  ```

  And then use it in the component's template:

  ```html
  <!-- app-profile template -->

  <h1>{{person.title}}</h1>
  {{yield}} <!-- block contents -->

  <button {{action 'hello' person.name}}>
    Say Hello to {{person.name}}
  </button>
  ```

  Components must have a `-` in their name to avoid
  conflicts with built-in controls that wrap HTML
  elements. This is consistent with the same
  requirement in web components.

  @class Component
  @namespace Ember
  @extends Ember.View
*/
Ember.Component = Ember.View.extend({
  init: function() {
    this._super();
    this.set('context', this);
    this.set('controller', this);
  }
});
