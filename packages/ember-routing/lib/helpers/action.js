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

  var isAllowedClick = function(event, allowedKeys) {
    if (typeof allowedKeys === "undefined") {
      return isSimpleClick(event);
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
        if (!isAllowedClick(event, allowedKeys)) { return true; }

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
    event handling and forwards that interaction to the view's controller
    or supplied `target` option (see 'Specifying a Target').

    If the view's controller does not implement the event, the event is sent
    to the current route, and it bubbles up the route hierarchy from there.

    User interaction with that element will invoke the supplied action name on
    the appropriate target.

    Given the following Handlebars template on the page

    ```handlebars
    <script type="text/x-handlebars" data-template-name='a-template'>
      <div {{action anActionName}}>
        click me
      </div>
    </script>
    ```

    And application code

    ```javascript
    AController = Ember.Controller.extend({
      anActionName: function() {}
    });

    AView = Ember.View.extend({
      controller: AController.create(),
      templateName: 'a-template'
    });

    aView = AView.create();
    aView.appendTo('body');
    ```

    Will result in the following rendered HTML

    ```html
    <div class="ember-view">
      <div data-ember-action="1">
        click me
      </div>
    </div>
    ```

    Clicking "click me" will trigger the `anActionName` method of the
    `AController`. In this case, no additional parameters will be passed.

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
    own event handler, or use event methods on your view class. See `Ember.View`
    'Responding to Browser Events' for more information.

    ### Specifying DOM event type

    By default the `{{action}}` helper registers for DOM `click` events. You can
    supply an `on` option to the helper to specify a different DOM event name:

    ```handlebars
    <script type="text/x-handlebars" data-template-name='a-template'>
      <div {{action anActionName on="doubleClick"}}>
        click me
      </div>
    </script>
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
    <script type="text/x-handlebars" data-template-name='a-template'>
      <div {{action anActionName allowedKeys="alt"}}>
        click me
      </div>
    </script>
    ```

    This way the `{{action}}` will fire when clicking with the alt key pressed down.

    ### Specifying a Target

    There are several possible target objects for `{{action}}` helpers:

    In a typical Ember application, where views are managed through use of the
    `{{outlet}}` helper, actions will bubble to the current controller, then
    to the current route, and then up the route hierarchy.

    Alternatively, a `target` option can be provided to the helper to change
    which object will receive the method call. This option must be a path
    path to an object, accessible in the current context:

    ```handlebars
    <script type="text/x-handlebars" data-template-name='a-template'>
      <div {{action anActionName target="MyApplication.someObject"}}>
        click me
      </div>
    </script>
    ```

    Clicking "click me" in the rendered HTML of the above template will trigger
    the  `anActionName` method of the object at `MyApplication.someObject`.

    If an action's target does not implement a method that matches the supplied
    action name an error will be thrown.

    ```handlebars
    <script type="text/x-handlebars" data-template-name='a-template'>
      <div {{action aMethodNameThatIsMissing}}>
        click me
      </div>
    </script>
    ```

    With the following application code

    ```javascript
    AView = Ember.View.extend({
      templateName; 'a-template',
      // note: no method 'aMethodNameThatIsMissing'
      anActionName: function(event) {}
    });

    aView = AView.create();
    aView.appendTo('body');
    ```

    Will throw `Uncaught TypeError: Cannot call method 'call' of undefined` when
    "click me" is clicked.

    ### Additional Parameters

    You may specify additional parameters to the `{{action}}` helper. These
    parameters are passed along as the arguments to the JavaScript function
    implementing the action.

    ```handlebars
    <script type="text/x-handlebars" data-template-name='a-template'>
      {{#each person in people}}
        <div {{action edit person}}>
          click me
        </div>
      {{/each}}
    </script>
    ```

    Clicking "click me" will trigger the `edit` method on the current view's
    controller with the current person as a parameter.

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

    action.target = { root: root, target: target, options: options };
    action.bubbles = hash.bubbles;

    var actionId = ActionHelper.registerAction(actionName, action, hash.allowedKeys);
    return new SafeString('data-ember-action="' + actionId + '"');
  });

});
