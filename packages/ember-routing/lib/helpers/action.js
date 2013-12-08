/**
@module ember
@submodule ember-routing
*/

require('ember-handlebars/ext');
require('ember-handlebars/helpers/view');

Ember.onLoad('Ember.Handlebars', function(Handlebars) {

  var resolveParams = Ember.Router.resolveParams,
      isSimpleClick = Ember.ViewUtils.isSimpleClick;

  var EmberHandlebars = Ember.Handlebars,
      handlebarsGet = EmberHandlebars.get,
      SafeString = EmberHandlebars.SafeString,
      forEach = Ember.ArrayPolyfills.forEach,
      get = Ember.get,
      a_slice = Array.prototype.slice;

  function args(options, actionName) {
    var ret = [];
    if (actionName) { ret.push(actionName); }

    var types = options.options.types.slice(1),
        data = options.options.data;

    return ret.concat(resolveParams(options.context, options.params, { types: types, data: data }));
  }

  var ActionHelper = EmberHandlebars.ActionHelper = {
    registeredActions: {}
  };

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

  ActionHelper.registerAction = function(actionName, options, allowedKeys) {
    var actionId = (++Ember.uuid).toString();

    ActionHelper.registeredActions[actionId] = {
      eventName: options.eventName,
      handler: function(event) {
        if (!isAllowedEvent(event, allowedKeys)) { return true; }

        event.preventDefault();

        if (options.bubbles === false) {
          event.stopPropagation();
        }

        var target = options.target;

        if (target.target) {
          target = handlebarsGet(target.root, target.target, target.options);
        } else {
          target = target.root;
        }

        Ember.run(function() {
          if (target.send) {
            target.send.apply(target, args(options.parameters, actionName));
          } else {
            Ember.assert("The action '" + actionName + "' did not exist on " + target, typeof target[actionName] === 'function');
            target[actionName].apply(target, args(options.parameters));
          }
        });
      }
    };

    options.view.on('willClearRender', function() {
      delete ActionHelper.registeredActions[actionId];
    });

    return actionId;
  };

  /**
    The `{{action}}` helper registers an HTML element within a template for DOM
    event handling and forwards that interaction to the templates's controller
    or supplied `target` option (see 'Specifying a Target').

    If the controller does not implement the event, the event is sent
    to the current route, and it bubbles up the route hierarchy from there.

    User interaction with that element will invoke the supplied action name on
    the appropriate target.

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
    handlers.

    To also disable bubbling, pass `bubbles=false` to the helper:

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

    NOTE: Because `{{action}}` depends on Ember's event dispatch system it will
    only function if an `Ember.EventDispatcher` instance is available. An
    `Ember.EventDispatcher` instance will be created when a new `Ember.Application`
    is created. Having an instance of `Ember.Application` will satisfy this
    requirement.

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

    In a typical Ember application, where views are managed through use of the
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

    You can use `{{action}}` as a toggle for a boolean value.

    ```handlebars
    <button {{action toggle=show}}>Show</button>
    ```

    The `show` property will be toggled between `true` and `false`.
    ```

    This works on any `xProperty` function on the controller. For example,
    `incrementProperty`

    ```handlebars
    <button {{action increment=count}}Add 1</button>
    ```

    It can even work on custom functions defined on the controller that
    conform to `xProperty` naming:

    ```javascript
    controller = Ember.Controller.extend({
      doubleProperty: function(property) {
        this.set(property, (this.get(property) || 0) * 2);
      }
    });
    ```

    ```handlebars
    <button {{action double=wins}}>Cheat</button>
    ```

    @method action
    @for Ember.Handlebars.helpers
    @param {String} actionName
    @param {Object} [context]*
    @param {Hash} options
  */
  EmberHandlebars.registerHelper('action', function(actionName) {
    var options = arguments[arguments.length - 1],
        contexts = a_slice.call(arguments, 1, -1);

    var hash = options.hash,
        controller;

    // create a hash to pass along to registerAction
    var action = {
      eventName: hash.on || "click"
    };

    action.parameters = {
      context: this,
      options: options,
      params: contexts
    };

    action.view = options.data.view;

    var root, target;

    if (hash.target) {
      root = this;
      target = hash.target;
    } else if (controller = options.data.keywords.controller) {
      root = controller;
    }

    if (Ember.FEATURES.isEnabled('property-action')) {
      if (root) {
        var match, property, type;

        if (!root._actions) {
          root._actions = {};
        }

        for (property in root) {
          if (match = property.match(/^(\w+)Property$/)) {
            type = match[1];

            if (hash[type]) {
              actionName = '' + type + ':' + hash[type];

              if (!root._actions[actionName]) {
                /*jshint loopfunc: true */
                root._actions[actionName] = function(type) {
                  return function() {
                    this[type + 'Property'](hash[type]);
                  };
                }(type);
              }
            }
          }
        }
      }
    }

    action.target = { root: root, target: target, options: options };
    action.bubbles = hash.bubbles;

    var actionId = ActionHelper.registerAction(actionName, action, hash.allowedKeys);
    return new SafeString('data-ember-action="' + actionId + '"');
  });

});
