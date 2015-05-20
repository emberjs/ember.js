import Ember from "ember-metal/core"; // Ember.assert, Ember.Handlebars

import ComponentTemplateDeprecation from "ember-views/mixins/component_template_deprecation";
import TargetActionSupport from "ember-runtime/mixins/target_action_support";
import ViewContextSupport from "ember-views/mixins/view_context_support";
import ViewChildViewsSupport from "ember-views/mixins/view_child_views_support";
import ViewStateSupport from "ember-views/mixins/view_state_support";
import TemplateRenderingSupport from "ember-views/mixins/template_rendering_support";
import TemplateLookupSupport from "ember-views/mixins/template_lookup_support";
import ClassNamesSupport from "ember-views/mixins/class_names_support";
import LegacyViewSupport from "ember-views/mixins/legacy_view_support";
import InstrumentationSupport from "ember-views/mixins/instrumentation_support";
import Evented from "ember-runtime/mixins/evented";
import ActionHandler from "ember-runtime/mixins/action_handler";
import VisibilitySupport from "ember-views/mixins/visibility_support";
import CompatAttrsProxy from "ember-views/compat/attrs-proxy";
import DOMSupport from "ember-views/mixins/dom_support";
import CoreView from "ember-views/views/core_view";

// The only dependency left for Ember.View is falling back to the
// Ember.View.views hash, which is unfortunately still set for backwards
// compatibility by Ember.Application. If we can deprecate Ember.View.views
// and remove it in 2.0, we can eliminate this dependency.
import View from "ember-views/views/view";

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import isNone from 'ember-metal/is_none';

import { computed } from "ember-metal/computed";

import { MUTABLE_CELL } from "ember-views/compat/attrs-proxy";

function validateAction(component, actionName) {
  if (actionName && actionName[MUTABLE_CELL]) {
    actionName = actionName.value;
  }
  Ember.assert("The default action was triggered on the component " + component.toString() +
               ", but the action name (" + actionName + ") was not a string.",
               isNone(actionName) || typeof actionName === 'string' || typeof actionName === 'function');
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
*/
var Component = CoreView.extend(
  DOMSupport,
  TargetActionSupport,
  ViewContextSupport,
  ViewChildViewsSupport,
  ViewStateSupport,
  TemplateRenderingSupport,
  TemplateLookupSupport,
  ClassNamesSupport,
  LegacyViewSupport,
  InstrumentationSupport,
  VisibilitySupport,
  Evented,
  ActionHandler,
  ComponentTemplateDeprecation,
  CompatAttrsProxy, {

  concatenatedProperties: ['attributeBindings'],

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

    if (!this._viewRegistry) {
      this._viewRegistry = View.views;
    }
  },

  __defineNonEnumerable(property) {
    this[property.name] = property.descriptor.value;
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
  template: computed('templateName', {
    get() {
      var templateName = get(this, 'templateName');
      var template = this.templateForName(templateName, 'template');

      Ember.assert("You specified the templateName " + templateName + " for " + this + ", but it did not exist.", !templateName || !!template);
      return template || get(this, 'defaultTemplate');
    },
    set(key, value) {
      return value;
    }
  }),

  /**
  Specifying a components `templateName` is deprecated without also
  providing the `layout` or `layoutName` properties.

  @deprecated
  @property templateName
  */
  templateName: null,

  /**
    If the component is currently inserted into the DOM of a parent view, this
    property will point to the controller of the parent view.

    @property targetObject
    @type Ember.Controller
    @default null
  */
  targetObject: computed('controller', function(key) {
    if (this._targetObject) { return this._targetObject; }
    if (this._controller) { return this._controller; }
    var parentView = get(this, 'parentView');
    return parentView ? get(parentView, 'controller') : null;
  }),

  /**
    Triggers a named action on the controller context where the component is used if
    this controller has registered for notifications of the action.

    For example a component for playing or pausing music may translate click events
    into action notifications of "play" or "stop" depending on some internal state
    of the component:


    ```javascript
    App.PlayButtonComponent = Ember.Component.extend({
      click: function() {
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
        musicStarted: function() {
          // called when the play button is clicked
          // and the music started playing
        },
        musicStopped: function() {
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
      click: function() {
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
        playNextSongInAlbum: function() {
          ...
        }
      }
    });
    ```

    @method sendAction
    @param [action] {String} the action to trigger
    @param [context] {*} a context to send with the action
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
    var hasAction = this._actions && this._actions[actionName];

    if (hasAction) {
      var shouldBubble = this._actions[actionName].apply(this, args) === true;
      if (!shouldBubble) { return; }
    }

    if (target = get(this, 'target')) {
      Ember.assert("The `target` for " + this + " (" + target +
                   ") does not have a `send` method", typeof target.send === 'function');
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
});

export default Component;
