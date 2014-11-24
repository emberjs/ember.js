/**
@module ember
@submodule ember-routing-handlebars
*/

import Ember from "ember-metal/core"; // Handlebars, uuid, FEATURES, assert, deprecate
import EmberHandlebars from "ember-handlebars";
import { forEach } from "ember-metal/array";
import { uuid } from "ember-metal/utils";
import run from "ember-metal/run_loop";
import { readUnwrappedModel } from "ember-views/streams/read";
import { isSimpleClick } from "ember-views/system/utils";
import ActionManager from "ember-views/system/action_manager";

function actionArgs(parameters, actionName) {
  var ret, i;

  if (actionName === undefined) {
    ret = new Array(parameters.length);
    for (i = 0; i < parameters.length; i++) {
      ret[i] = readUnwrappedModel(parameters[i]);
    }
  } else {
    ret = new Array(parameters.length + 1);
    ret[0] = actionName;
    for (i = 0; i < parameters.length; i++) {
      ret[i + 1] = readUnwrappedModel(parameters[i]);
    }
  }

  return ret;
}

var ActionHelper = {};

// registeredActions is re-exported for compatibility with older plugins
// that were using this undocumented API.
ActionHelper.registeredActions = ActionManager.registeredActions;

export { ActionHelper };

var keys = ["alt", "shift", "meta", "ctrl"];

var POINTER_EVENT_TYPE_REGEX = /^click|mouse|touch/;

var isAllowedEvent = function(event, allowedKeys) {
  if (typeof allowedKeys === "undefined") {
    if (POINTER_EVENT_TYPE_REGEX.test(event.type)) {
      return isSimpleClick(event);
    } else {
      allowedKeys = '';
    }
  }

  if (allowedKeys.indexOf("any") >= 0) {
    return true;
  }

  var allowed = true;

  forEach.call(keys, function(key) {
    if (event[key + "Key"] && allowedKeys.indexOf(key) === -1) {
      allowed = false;
    }
  });

  return allowed;
};

function isKeyEvent(eventName) {
  return ['keyUp', 'keyPress', 'keyDown'].indexOf(eventName) !== -1;
}

function ignoreKeyEvent(eventName, event, keyCode) {
  var any = 'any';
  keyCode = keyCode || any;
  return isKeyEvent(eventName) && keyCode !== any && keyCode !== event.which.toString();
}

ActionHelper.registerAction = function(actionNameOrStream, options, allowedKeys) {
  var actionId = uuid();
  var eventName = options.eventName;
  var parameters = options.parameters;

  ActionManager.registeredActions[actionId] = {
    eventName: eventName,
    handler: function handleRegisteredAction(event) {
      if (!isAllowedEvent(event, allowedKeys)) { return true; }

      if (options.preventDefault !== false) {
        event.preventDefault();
      }

      if (options.bubbles === false) {
        event.stopPropagation();
      }

      var target = options.target.value();

      if (Ember.FEATURES.isEnabled("ember-routing-handlebars-action-with-key-code")) {
        if (ignoreKeyEvent(eventName, event, options.withKeyCode)) {
          return;
        }
      }

      var actionName;

      if (actionNameOrStream.isStream) {
        actionName = actionNameOrStream.value();

        Ember.assert("You specified a quoteless path to the {{action}} helper " +
                     "which did not resolve to an action name (a string). " +
                     "Perhaps you meant to use a quoted actionName? (e.g. {{action 'save'}}).",
                     typeof actionName === 'string');
      } else {
        actionName = actionNameOrStream;
      }

      run(function runRegisteredAction() {
        if (target.send) {
          target.send.apply(target, actionArgs(parameters, actionName));
        } else {
          Ember.assert("The action '" + actionName + "' did not exist on " + target, typeof target[actionName] === 'function');
          target[actionName].apply(target, actionArgs(parameters));
        }
      });
    }
  };

  options.view.on('willClearRender', function() {
    delete ActionManager.registeredActions[actionId];
  });

  return actionId;
};

/**
  The `{{action}}` helper provides a useful shortcut for registering an HTML
  element within a template for a single DOM event and forwarding that
  interaction to the template's controller or specified `target` option.

  If the controller does not implement the specified action, the event is sent
  to the current route, and it bubbles up the route hierarchy from there.

  For more advanced event handling see [Ember.Component](/api/classes/Ember.Component.html)


  ### Use
  Given the following application Handlebars template on the page

  ```handlebars
  <div {{action 'anActionName'}}>
    click me
  </div>
  ```

  And application code

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    actions: {
      anActionName: function() {
      }
    }
  });
  ```

  Will result in the following rendered HTML

  ```html
  <div class="ember-view">
    <div data-ember-action="1">
      click me
    </div>
  </div>
  ```

  Clicking "click me" will trigger the `anActionName` action of the
  `App.ApplicationController`. In this case, no additional parameters will be passed.

  If you provide additional parameters to the helper:

  ```handlebars
  <button {{action 'edit' post}}>Edit</button>
  ```

  Those parameters will be passed along as arguments to the JavaScript
  function implementing the action.

  ### Event Propagation

  Events triggered through the action helper will automatically have
  `.preventDefault()` called on them. You do not need to do so in your event
  handlers. If you need to allow event propagation (to handle file inputs for
  example) you can supply the `preventDefault=false` option to the `{{action}}` helper:

  ```handlebars
  <div {{action "sayHello" preventDefault=false}}>
    <input type="file" />
    <input type="checkbox" />
  </div>
  ```

  To disable bubbling, pass `bubbles=false` to the helper:

  ```handlebars
  <button {{action 'edit' post bubbles=false}}>Edit</button>
  ```

  If you need the default handler to trigger you should either register your
  own event handler, or use event methods on your view class. See [Ember.View](/api/classes/Ember.View.html)
  'Responding to Browser Events' for more information.

  ### Specifying DOM event type

  By default the `{{action}}` helper registers for DOM `click` events. You can
  supply an `on` option to the helper to specify a different DOM event name:

  ```handlebars
  <div {{action "anActionName" on="doubleClick"}}>
    click me
  </div>
  ```

  See `Ember.View` 'Responding to Browser Events' for a list of
  acceptable DOM event names.

  ### Specifying whitelisted modifier keys

  By default the `{{action}}` helper will ignore click event with pressed modifier
  keys. You can supply an `allowedKeys` option to specify which keys should not be ignored.

  ```handlebars
  <div {{action "anActionName" allowedKeys="alt"}}>
    click me
  </div>
  ```

  This way the `{{action}}` will fire when clicking with the alt key pressed down.

  Alternatively, supply "any" to the `allowedKeys` option to accept any combination of modifier keys.

  ```handlebars
  <div {{action "anActionName" allowedKeys="any"}}>
    click me with any key pressed
  </div>
  ```

  ### Specifying a Target

  There are several possible target objects for `{{action}}` helpers:

  In a typical Ember application, where templates are managed through use of the
  `{{outlet}}` helper, actions will bubble to the current controller, then
  to the current route, and then up the route hierarchy.

  Alternatively, a `target` option can be provided to the helper to change
  which object will receive the method call. This option must be a path
  to an object, accessible in the current context:

  ```handlebars
  {{! the application template }}
  <div {{action "anActionName" target=view}}>
    click me
  </div>
  ```

  ```javascript
  App.ApplicationView = Ember.View.extend({
    actions: {
      anActionName: function(){}
    }
  });

  ```

  ### Additional Parameters

  You may specify additional parameters to the `{{action}}` helper. These
  parameters are passed along as the arguments to the JavaScript function
  implementing the action.

  ```handlebars
  {{#each person in people}}
    <div {{action "edit" person}}>
      click me
    </div>
  {{/each}}
  ```

  Clicking "click me" will trigger the `edit` method on the current controller
  with the value of `person` as a parameter.

  @method action
  @for Ember.Handlebars.helpers
  @param {String} actionName
  @param {Object} [context]*
  @param {Hash} options
*/
export function actionHelper(actionName) {
  var length = arguments.length;
  var options = arguments[length - 1];
  var view = options.data.view;
  var hash = options.hash;
  var types = options.types;

  // create a hash to pass along to registerAction
  var parameters = [];

  var actionOptions = {
    eventName: hash.on || "click",
    parameters: parameters,
    view: options.data.view,
    bubbles: hash.bubbles,
    preventDefault: hash.preventDefault,
    target: view.getStream(hash.target || 'controller'),
    withKeyCode: hash.withKeyCode
  };

  var actionNameStream;

  if (types[0] === "ID") {
    actionNameStream = view.getStream(actionName);
    actionNameStream._originalPath = actionName;
  } else {
    actionNameStream = actionName;
  }

  for (var i = 1; i < length - 1; i++) {
    if (types[i] === "ID") {
      parameters.push(view.getStream(arguments[i]));
    } else {
      parameters.push(arguments[i]);
    }
  }

  var actionId = ActionHelper.registerAction(actionNameStream, actionOptions, hash.allowedKeys);
  return new EmberHandlebars.SafeString('data-ember-action="' + actionId + '"');
}
