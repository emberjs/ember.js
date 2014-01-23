require("ember-views/views/view");
require("ember-views/mixins/component_template_deprecation");

var get = Ember.get, set = Ember.set, isNone = Ember.isNone,
    a_slice = Array.prototype.slice;


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
  contextual information must be passed in.

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

  You can use `yield` inside a template to
  include the **contents** of any block attached to
  the component. The block will be executed in the
  context of the surrounding context or outer controller:

  ```handlebars
  {{#app-profile person=currentUser}}
    <p>Admin mode</p>
    {{! Executed in the controller's context. }}
  {{/app-profile}}
  ```

  ```handlebars
  <!-- app-profile template -->
  <h1>{{person.title}}</h1>
  {{! Executed in the components context. }}
  {{yield}} {{! block contents }}
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
    actions: {
      hello: function(name) {
        console.log("Hello", name);
      }
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
Ember.Component = Ember.View.extend(Ember.TargetActionSupport, Ember.ComponentTemplateDeprecation, {
  init: function() {
    this._super();
    set(this, 'context', this);
    set(this, 'controller', this);
  },

  defaultLayout: function(context, options){
    Ember.Handlebars.helpers['yield'].call(context, options);
  },

  /**
  A components template property is set by passing a block
  during its invocation. It is executed within the parent context.

  Example:

  ```handlebars
  {{#my-component}}
    // something that is run in the context
    // of the parent context
  {{/my-component}}
  ```

  Specifying a template directly to a component is deprecated without
  also specifying the layout property.

  @deprecated
  @property template
  */
  template: Ember.computed(function(key, value) {
    if (value !== undefined) { return value; }

    var templateName = get(this, 'templateName'),
        template = this.templateForName(templateName, 'template');

    Ember.assert("You specified the templateName " + templateName + " for " + this + ", but it did not exist.", !templateName || template);

    return template || get(this, 'defaultTemplate');
  }).property('templateName'),

  /**
  Specifying a components `templateName` is deprecated without also
  providing the `layout` or `layoutName` properties.

  @deprecated
  @property templateName
  */
  templateName: null,

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
    Triggers a named action on the controller context where the component is used if
    this controller has registered for notifications of the action.

    For example a component for playing or pausing music may translate click events
    into action notifications of "play" or "stop" depending on some internal state
    of the component:


    ```javascript
    App.PlayButtonComponent = Ember.Component.extend({
      click: function(){
        if (this.get('isPlaying')) {
          this.sendAction('play');
        } else {
          this.sendAction('stop');
        }
      }
    });
    ```

    When used inside a template these component actions are configured to
    trigger actions in the outer application context:

    ```handlebars
    {{! application.hbs }}
    {{play-button play="musicStarted" stop="musicStopped"}}
    ```

    When the component receives a browser `click` event it translate this
    interaction into application-specific semantics ("play" or "stop") and
    triggers the specified action name on the controller for the template
    where the component is used: 


    ```javascript
    App.ApplicationController = Ember.Controller.extend({
      actions: {
        musicStarted: function(){
          // called when the play button is clicked
          // and the music started playing
        },
        musicStopped: function(){
          // called when the play button is clicked
          // and the music stopped playing
        }
      }
    });
    ```

    If no action name is passed to `sendAction` a default name of "action"
    is assumed.

    ```javascript
    App.NextButtonComponent = Ember.Component.extend({
      click: function(){
        this.sendAction();
      }
    });
    ```

    ```handlebars
    {{! application.hbs }}
    {{next-button action="playNextSongInAlbum"}}
    ```

    ```javascript
    App.ApplicationController = Ember.Controller.extend({
      actions: {
        playNextSongInAlbum: function(){
          ...
        }
      }
    });
    ```

    @method sendAction
    @param [action] {String} the action to trigger
    @param [context] {*} a context to send with the action
  */
  sendAction: function(action) {
    var actionName,
        contexts = a_slice.call(arguments, 1);

    // Send the default action
    if (action === undefined) {
      actionName = get(this, 'action');
      Ember.assert("The default action was triggered on the component " + this.toString() +
                   ", but the action name (" + actionName + ") was not a string.",
                   isNone(actionName) || typeof actionName === 'string');
    } else {
      actionName = get(this, action);
      Ember.assert("The " + action + " action was triggered on the component " +
                   this.toString() + ", but the action name (" + actionName +
                   ") was not a string.",
                   isNone(actionName) || typeof actionName === 'string');
    }

    // If no action name for that action could be found, just abort.
    if (actionName === undefined) { return; }

    this.triggerAction({
      action: actionName,
      actionContext: contexts
    });
  }
});
