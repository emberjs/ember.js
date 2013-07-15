require('ember-handlebars/ext');

/**
@module ember
@submodule ember-old-router
*/

var EmberHandlebars = Ember.Handlebars,
    handlebarsGet = EmberHandlebars.get,
    get = Ember.get,
    a_slice = Array.prototype.slice;

var ActionHelper = EmberHandlebars.ActionHelper = {
  registeredActions: {}
};

ActionHelper.registerAction = function(actionName, options) {
  var actionId = (++Ember.uuid).toString();

  ActionHelper.registeredActions[actionId] = {
    eventName: options.eventName,
    handler: function(event) {
      var modifier = event.shiftKey || event.metaKey || event.altKey || event.ctrlKey,
          secondaryClick = event.which > 1, // IE9 may return undefined
          nonStandard = modifier || secondaryClick;

      if (options.link && nonStandard) {
        // Allow the browser to handle special link clicks normally
        return;
      }

      event.preventDefault();

      event.view = options.view;

      if (options.hasOwnProperty('context')) {
        event.context = options.context;
      }

      if (options.hasOwnProperty('contexts')) {
        event.contexts = options.contexts;
      }

      var target = options.target;

      // Check for StateManager (or compatible object)
      if (typeof target.send === 'function') {
        return target.send(actionName, event);
      } else {
        Ember.assert(Ember.String.fmt('Target %@ does not have action %@', [target, actionName]), target[actionName]);
        return target[actionName].call(target, event);
      }
    }
  };

  options.view.on('willClearRender', function() {
    delete ActionHelper.registeredActions[actionId];
  });

  return actionId;
};

/**
  The `{{action}}` helper registers an HTML element within a template for DOM
  event handling and forwards that interaction to the view's
  `controller.target` or supplied `target` option (see 'Specifying a Target').
  By default the `controller.target` is set to the application's router.

  User interaction with that element will invoke the supplied action name on
  the appropriate target.

  Given the following Handlebars template on the page

  ```handlebars
  <script type="text/x-handlebars" data-template-name='a-template'>
    <div {{action anActionName target="view"}}>
      click me
    </div>
  </script>
  ```

  And application code

  ```javascript
  AView = Ember.View.extend({
    templateName: 'a-template',
    anActionName: function(event) {}
  });

  aView = AView.create();
  aView.appendTo('body');
  ```

  Will results in the following rendered HTML

  ```html
  <div class="ember-view">
    <div data-ember-action="1">
      click me
    </div>
  </div>
  ```

  Clicking "click me" will trigger the `anActionName` method of the `aView`
  object with a  `jQuery.Event` object as its argument. The `jQuery.Event`
  object will be extended to include a `view` property that is set to the
  original view interacted with (in this case the `aView` object).

  ### Event Propagation

  Events triggered through the action helper will automatically have
  `.preventDefault()` called on them. You do not need to do so in your event
  handlers. To stop propagation of the event, simply return `false` from your
  handler.

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

  Because `{{action}}` depends on Ember's event dispatch system it will only
  function if an `Ember.EventDispatcher` instance is available. An
  `Ember.EventDispatcher` instance will be created when a new
  `Ember.Application` is created. Having an instance of `Ember.Application`
  will satisfy this requirement.

  ### Specifying a Target

  There are several possible target objects for `{{action}}` helpers:

  In a typical `Ember.Router`-backed Application where views are managed
  through use of the `{{outlet}}` helper, actions will be forwarded to the
  current state of the Applications's Router. See `Ember.Router` 'Responding
  to User-initiated Events' for more information.

  If you manually set the `target` property on the controller of a template's
  `Ember.View` instance, the specifed `controller.target` will become the
  target for any actions. Likely custom values for a controller's `target` are
  the controller itself or a StateManager other than the Application's
  router.

  If the templates's view lacks a controller property the view itself is the
  target.

  Finally, a `target` option can be provided to the helper to change which
  object will receive the method call. This option must be a string
  representing a path to an object:

  ```handlebars
  <script type="text/x-handlebars" data-template-name='a-template'>
    <div {{action anActionName target="MyApplication.someObject"}}>
      click me
    </div>
  </script>
  ```

  Clicking "click me" in the rendered HTML of the above template will trigger
  the  `anActionName` method of the object at `MyApplication.someObject`.
  The first argument to this method will be a `jQuery.Event` extended to
  include a `view` property that is set to the original view interacted with.

  A path relative to the template's `Ember.View` instance can also be used as
  a target:

  ```handlebars
  <script type="text/x-handlebars" data-template-name='a-template'>
    <div {{action anActionName target="parentView"}}>
      click me
    </div>
  </script>
  ```

  Clicking "click me" in the rendered HTML of the above template will trigger
  the `anActionName` method of the view's parent view.

  The `{{action}}` helper is `Ember.StateManager` aware. If the target of the
  action is an `Ember.StateManager` instance `{{action}}` will use the `send`
  functionality of StateManagers. The documentation for `Ember.StateManager`
  has additional information about this use.

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

  ### Specifying a context

  You may optionally specify objects to pass as contexts to the `{{action}}`
  helper by providing property paths as the subsequent parameters. These
  objects are made available as the `contexts` (also `context` if there is only
  one) properties in the `jQuery.Event` object:

  ```handlebars
  <script type="text/x-handlebars" data-template-name='a-template'>
    {{#each person in people}}
      <div {{action edit person}}>
        click me
      </div>
    {{/each}}
  </script>
  ```

  Clicking "click me" will trigger the `edit` method of the view's context with
  a `jQuery.Event` object containing the person object as its context.

  @method action
  @for Ember.Handlebars.helpers
  @param {String} actionName
  @param {Object...} contexts
  @param {Hash} options
*/
EmberHandlebars.registerHelper('action', function(actionName) {
  var options = arguments[arguments.length - 1],
      contexts = a_slice.call(arguments, 1, -1);

  var hash = options.hash,
      view = options.data.view,
      target, controller, link;

  // create a hash to pass along to registerAction
  var action = {
    eventName: hash.on || "click"
  };

  action.view = view = get(view, 'concreteView');

  if (hash.target) {
    target = handlebarsGet(this, hash.target, options);
  } else if (controller = options.data.keywords.controller) {
    target = controller;
  }

  action.target = target = target || view;

  if (contexts.length) {
    action.contexts = contexts = Ember.EnumerableUtils.map(contexts, function(context) {
      return handlebarsGet(this, context, options);
    }, this);
    action.context = contexts[0];
  }

  var output = [], url;

  if (hash.href && target.urlForEvent) {
    url = target.urlForEvent.apply(target, [actionName].concat(contexts));
    output.push('href="' + url + '"');
    action.link = true;
  }

  var actionId = ActionHelper.registerAction(actionName, action);
  output.push('data-ember-action="' + actionId + '"');

  return new EmberHandlebars.SafeString(output.join(" "));
});
