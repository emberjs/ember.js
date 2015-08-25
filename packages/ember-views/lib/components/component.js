import Ember from 'ember-metal/core';
import { assert } from 'ember-metal/debug';

import TargetActionSupport from 'ember-runtime/mixins/target_action_support';
import View from 'ember-views/views/view';

import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import isNone from 'ember-metal/is_none';

import { computed } from 'ember-metal/computed';

import { MUTABLE_CELL } from 'ember-views/compat/attrs-proxy';

function validateAction(component, actionName) {
  if (actionName && actionName[MUTABLE_CELL]) {
    actionName = actionName.value;
  }
  assert(
    'The default action was triggered on the component ' + component.toString() +
    ', but the action name (' + actionName + ') was not a string.',
    isNone(actionName) || typeof actionName === 'string' || typeof actionName === 'function'
  );
  return actionName;
}

/**
@module ember
@submodule ember-views
*/

/**
  An `Ember.Component` is a view that is completely
  isolated. Properties accessed in its templates go
  to the view object and actions are targeted at
  the view object. There is no access to the
  surrounding context or outer controller; all
  contextual information must be passed in.

  The easiest way to create an `Ember.Component` is via
  a template. If you name a template
  `components/my-foo`, you will be able to use
  `{{my-foo}}` in other templates, which will make
  an instance of the isolated component.

  ```handlebars
  {{app-profile person=currentUser}}
  ```

  ```handlebars
  <!-- app-profile template -->
  <h1>{{person.title}}</h1>
  <img src={{person.avatar}}>
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

  ```handlebars
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
  @public
*/
var Component = View.extend(TargetActionSupport, {
  isComponent: true,
  /*
    This is set so that the proto inspection in appendTemplatedView does not
    think that it should set the components `context` to that of the parent view.
  */
  controller: null,
  context: null,

  instrumentName: 'component',
  instrumentDisplay: computed(function() {
    if (this._debugContainerKey) {
      return '{{' + this._debugContainerKey.split(':')[1] + '}}';
    }
  }),

  init() {
    this._super.apply(this, arguments);
    set(this, 'controller', this);
    set(this, 'context', this);
  },

  template: null,

  /**
    If the component is currently inserted into the DOM of a parent view, this
    property will point to the controller of the parent view.

    @property targetObject
    @type Ember.Controller
    @default null
    @private
  */
  targetObject: computed('controller', function(key) {
    if (this._targetObject) { return this._targetObject; }
    if (this._controller) { return this._controller; }
    var parentView = get(this, 'parentView');
    return parentView ? get(parentView, 'controller') : null;
  }),

  /**
    Calls a action passed to a component.

    For example a component for playing or pausing music may translate click events
    into action notifications of "play" or "stop" depending on some internal state
    of the component:

    ```javascript
    // app/components/play-button.js
    export default Ember.Component.extend({
      click() {
        if (this.get('isPlaying')) {
          this.sendAction('play');
        } else {
          this.sendAction('stop');
        }
      }
    });
    ```

    The actions "play" and "stop" must be passed to this `play-button` component:

    ```handlebars
    {{! app/templates/application.hbs }}
    {{play-button play=(action "musicStarted") stop=(action "musicStopped")}}
    ```

    When the component receives a browser `click` event it translate this
    interaction into application-specific semantics ("play" or "stop") and
    calls the specified action.

    ```javascript
    // app/controller/application.js
    export default Ember.Controller.extend({
      actions: {
        musicStarted() {
          // called when the play button is clicked
          // and the music started playing
        },
        musicStopped() {
          // called when the play button is clicked
          // and the music stopped playing
        }
      }
    });
    ```

    If no action is passed to `sendAction` a default name of "action"
    is assumed.

    ```javascript
    // app/components/next-button.js
    export default Ember.Component.extend({
      click() {
        this.sendAction();
      }
    });
    ```

    ```handlebars
    {{! app/templates/application.hbs }}
    {{next-button action=(action "playNextSongInAlbum")}}
    ```

    ```javascript
    // app/controllers/application.js
    App.ApplicationController = Ember.Controller.extend({
      actions: {
        playNextSongInAlbum() {
          ...
        }
      }
    });
    ```

    @method sendAction
    @param [action] {String} the action to call
    @param [params] {*} arguments for the action
    @public
  */
  sendAction(action, ...contexts) {
    var actionName;

    // Send the default action
    if (action === undefined) {
      action = 'action';
    }
    actionName = get(this, 'attrs.' + action) || get(this, action);
    actionName = validateAction(this, actionName);

    // If no action name for that action could be found, just abort.
    if (actionName === undefined) { return; }

    if (typeof actionName === 'function') {
      actionName.apply(null, contexts);
    } else {
      this.triggerAction({
        action: actionName,
        actionContext: contexts
      });
    }
  },

  send(actionName, ...args) {
    var target;
    var hasAction = this.actions && this.actions[actionName];

    if (hasAction) {
      var shouldBubble = this.actions[actionName].apply(this, args) === true;
      if (!shouldBubble) { return; }
    }

    if (target = get(this, 'target')) {
      assert(
        'The `target` for ' + this + ' (' + target +
        ') does not have a `send` method',
        typeof target.send === 'function'
      );
      target.send(...arguments);
    } else {
      if (!hasAction) {
        throw new Error(Ember.inspect(this) + ' had no action handler for: ' + actionName);
      }
    }
  }

  /**
    Returns true when the component was invoked with a block template.

    Example (`hasBlock` will be `false`):

    ```hbs
    {{! templates/application.hbs }}

    {{foo-bar}}

    {{! templates/components/foo-bar.js }}
    {{#if hasBlock}}
      This will not be printed, because no block was provided
    {{/if}}
    ```

    Example (`hasBlock` will be `true`):

    ```hbs
    {{! templates/application.hbs }}

    {{#foo-bar}}
      Hi!
    {{/foo-bar}}

    {{! templates/components/foo-bar.js }}
    {{#if hasBlock}}
      This will be printed because a block was provided
      {{yield}}
    {{/if}}
    ```

    @public
    @property hasBlock
    @returns Boolean
  */

  /**
    Returns true when the component was invoked with a block parameter
    supplied.

    Example (`hasBlockParams` will be `false`):

    ```hbs
    {{! templates/application.hbs }}

    {{#foo-bar}}
      No block parameter.
    {{/foo-bar}}

    {{! templates/components/foo-bar.js }}
    {{#if hasBlockParams}}
      This will not be printed, because no block was provided
      {{yield this}}
    {{/if}}
    ```

    Example (`hasBlockParams` will be `true`):

    ```hbs
    {{! templates/application.hbs }}

    {{#foo-bar as |foo|}}
      Hi!
    {{/foo-bar}}

    {{! templates/components/foo-bar.js }}
    {{#if hasBlockParams}}
      This will be printed because a block was provided
      {{yield this}}
    {{/if}}
    ```
    @public
    @property hasBlockParams
    @returns Boolean
  */

  /**
    Enables components to take a list of parameters as arguments

    For example a component that takes two parameters with the names
    `name` and `age`:

    ```javascript
    let MyComponent = Ember.Component.extend;
    MyComponent.reopenClass({
      positionalParams: ['name', 'age']
    });
    ```

    It can then be invoked like this:

    ```hbs
    {{my-component "John" 38}}
    ```

    The parameters can be refered to just like named parameters:

    ```hbs
    Name: {{attrs.name}}, Age: {{attrs.age}}.
    ```

    Using a string instead of an array allows for an arbitrary number of
    parameters:

    ```javascript
    let MyComponent = Ember.Component.extend;
    MyComponent.reopenClass({
      positionalParams: 'names'
    });
    ```

    It can then be invoked like this:

    ```hbs
    {{my-component "John" "Michael" "Scott"}}
    ```

    The parameters can then be refered to by enumerating over the list:

    ```hbs
    {{#each attrs.names as |name|}}{{name}}{{/each}}
    ```

    @static
    @public
    @property positionalParams
  */
});

Component.reopenClass({
  isComponentFactory: true
});

export default Component;
