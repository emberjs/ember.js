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
  <img {{bind-attr src=person.avatar}}>
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
  component. Note that `Component` needs to be appended to the name of
  your subclass like `AppProfileComponent`.

  For example, you could implement the action
  `hello` for the `app-profile` component:

  ```javascript
  App.AppProfileComponent = Ember.Component.extend({
    hello: function(name) {
      console.log("Hello", name);
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
  },

  // during render, isolate keywords
  cloneKeywords: function() {
    return {
      view: this,
      controller: this
    };
  },

  _yield: function(context, options) {
    var view = options.data.view,
        parentView = this._parentView,
        template = get(this, 'template');

    if (template) {
      Ember.assert("A Component must have a parent view in order to yield.", parentView);

      view.appendChild(Ember.View, {
        isVirtual: true,
        tagName: '',
        _contextView: parentView,
        template: template,
        context: get(parentView, 'context'),
        controller: get(parentView, 'controller'),
        templateData: { keywords: parentView.cloneKeywords() }
      });
    }
  },

  /**
    If the component is currently inserted into the DOM of a parent view, this
    property will point to the controller of the parent view.

    @property targetObject
    @type Ember.Controller
    @default null
  */
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

    If you provide the `action` argument to `sendAction()`, that key will
    be used to look up the action name.

    For example, if the component had a property `playing` with the value
    `didStartPlaying`, calling `sendAction('playing')` would send the
    `didStartPlaying` action to the component's controller.

    Whether or not you are using the default action or a named action, if
    the action name is not defined on the component, calling `sendAction()`
    does not have any effect.

    For example, if you call `sendAction()` on a component that does not have
    an `action` property defined, no action will be sent to the controller,
    nor will an exception be raised.

    You can send a context object with the action by supplying the `context`
    argument. The context will be supplied as the first argument in the
    target's action method. Example:

    ```javascript
    App.MyTreeComponent = Ember.Component.extend({
      click: function() {
        this.sendAction('didClickTreeNode', this.get('node'));
      }
    });

    App.CategoriesController = Ember.Controller.extend({
      didClickCategory: function(category) {
        //Do something with the node/category that was clicked
      }
    });
    ```

    ```handlebars
    {{! categories.hbs}}
    {{my-tree didClickTreeNode='didClickCategory'}}
    ```

    @method sendAction
    @param [action] {String} the action to trigger
    @param [context] {*} a context to send with the action
  */
  sendAction: function(action, context) {
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
      action: actionName,
      actionContext: context
    });
  }
});
