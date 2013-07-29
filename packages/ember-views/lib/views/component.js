require("ember-views/views/view");

var get = Ember.get, set = Ember.set, isNone = Ember.isNone;

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
Ember.Component = Ember.View.extend(Ember.TargetActionSupport, {
  init: function() {
    this._super();
    set(this, 'context', this);
    set(this, 'controller', this);
    set(this, 'templateData', {keywords: {}});
  },

  targetObject: Ember.computed(function(key) {
    var parentView = get(this, '_parentView');
    return parentView ? get(parentView, 'controller') : null;
  }).property('_parentView'),

  /**
   Sends an action to component's controller. A component inherits its
   controller from the context in which it is used.

   By default, calling `sendAction()` will send an action with the name
   of the component's `action` property.

   For example, if the component had a property `action` with the value
   `"addItem"`, calling `sendAction()` would send the `addItem` action
   to the component's controller.

   If you provide an argument to `sendAction()`, that key will be used to look
   up the action name.

   For example, if the component had a property `playing` with the value
   `didStartPlaying`, calling `sendAction('playing')` would send the
   `didStartPlaying` action to the component's controller.

   Whether or not you are using the default action or a named action, if
   the action name is not defined on the component, calling `sendAction()`
   does not have any effect.

   For example, if you call `sendAction()` on a component that does not have
   an `action` property defined, no action will be sent to the controller,
   nor will an exception be raised.

   @param [action] {String} the action to trigger
  */
  sendAction: function(action) {
    var actionName;

    // Send the default action
    if (action === undefined) {
      actionName = get(this, 'action');
      Ember.assert("The default action was triggered on the component " + this.toString() + ", but the action name (" + actionName + ") was not a string.", isNone(actionName) || typeof actionName === 'string');
    } else {
      actionName = get(this, action);
      Ember.assert("The " + action + " action was triggered on the component " + this.toString() + ", but the action name (" + actionName + ") was not a string.", isNone(actionName) || typeof actionName === 'string');
    }


    // If no action name for that action could be found, just abort.
    if (actionName === undefined) { return; }

    this.triggerAction({
      action: actionName
    });
  }
});
