require('ember-handlebars/ext');

var EmberHandlebars = Ember.Handlebars, getPath = EmberHandlebars.getPath, get = Ember.get;

var ActionHelper = EmberHandlebars.ActionHelper = {
  registeredActions: {}
};

ActionHelper.registerAction = function(actionName, eventName, target, view, context) {
  var actionId = (++Ember.$.uuid).toString();

  ActionHelper.registeredActions[actionId] = {
    eventName: eventName,
    handler: function(event) {
      event.view = view;
      event.context = context;

      // Check for StateManager (or compatible object)
      if (target.isState && typeof target.send === 'function') {
        return target.send(actionName, event);
      } else {
        return target[actionName].call(target, event);
      }
    }
  };

  view.on('willRerender', function() {
    delete ActionHelper.registeredActions[actionId];
  });

  return actionId;
};

/**
  The `{{action}}` helper registers an HTML element within a template for
  DOM event handling.  User interaction with that element will call the method
  on the template's associated `Ember.View` instance that has the same name
  as the first provided argument to `{{action}}`:

  Given the following Handlebars template on the page

        <script type="text/x-handlebars" data-template-name='a-template'>
            <div {{action "anActionName"}}>
              click me
            </div>
        </script>

  And application code

        AView = Ember.View.extend({
          templateName; 'a-template',
          anActionName: function(event){}
        })

        aView = AView.create()
        aView.appendTo('body')

  Will results in the following rendered HTML

        <div class="ember-view">
          <div data-ember-action="1">
            click me
          </div>
        </div>

  Clicking "click me" will trigger the `anActionName` method of the `aView` object with a 
  `jQuery.Event` object as its argument. The `jQuery.Event` object will be extended to include
  a `view` property that is set to the original view interacted with (in this case the `aView` object).


  ### Specifying an Action Target
  A `target` option can be provided to change which object will receive the method call. This option must be
  a string representing a path to an object:

        <script type="text/x-handlebars" data-template-name='a-template'>
            <div {{action "anActionName" target="MyApplication.someObject"}}>
              click me
            </div>
        </script>

  Clicking "click me" in the rendered HTML of the above template will trigger the 
  `anActionName` method of the object at `MyApplication.someObject`.  The first argument 
  to this method will be a `jQuery.Event` extended to include a `view` property that is 
  set to the original view interacted with.

  A path relative to the template's `Ember.View` instance can also be used as a target:

        <script type="text/x-handlebars" data-template-name='a-template'>
            <div {{action "anActionName" target="parentView"}}>
              click me
            </div>
        </script>

  Clicking "click me" in the rendered HTML of the above template will trigger the 
  `anActionName` method of the view's parent view.

  The `{{action}}` helper is `Ember.StateManager` aware. If the target of
  the action is an `Ember.StateManager` instance `{{action}}` will use the `send`
  functionality of StateManagers. The documentation for `Ember.StateManager` has additional
  information about this use.

  If an action's target does not implement a method that matches the supplied action name
  an error will be thrown.


      <script type="text/x-handlebars" data-template-name='a-template'>
          <div {{action "aMethodNameThatIsMissing"}}>
            click me
          </div>
      </script>

  With the following application code

        AView = Ember.View.extend({
          templateName; 'a-template',
          // note: no method 'aMethodNameThatIsMissing'
          anActionName: function(event){}
        })

        aView = AView.create()
        aView.appendTo('body')

  Will throw `Uncaught TypeError: Cannot call method 'call' of undefined` when "click me" is clicked.


  ### Specifying DOM event type
  By default the `{{action}}` helper registers for DOM `click` events. You can supply an
  `on` option to the helper to specify a different DOM event name:

      <script type="text/x-handlebars" data-template-name='a-template'>
          <div {{action "aMethodNameThatIsMissing" on="doubleClick"}}>
            click me
          </div>
      </script>

  See `Ember.EventDispatcher` for a list of acceptable DOM event names.

  Because `{{action}}` depends on Ember's event dispatch system it will only function if
  an `Ember.EventDispatcher` instance is available. An `Ember.EventDispatcher` instance 
  will be created when a new `Ember.Application` is created. Having an instance of
  `Ember.Application` will satisfy this requirement.

  ### Specifying a context
  By default the `{{action}}` helper passes the current Handlebars context along in the
  `jQuery.Event` object. You may specify an alternative object to pass as the context by
  providing a property path:

      <script type="text/x-handlebars" data-template-name='a-template'>
        {{#each person in people}}
          <div {{action "edit" context="person"}}>
            click me
          </div>
        {{/each}}
      </script>

  @name Handlebars.helpers.action
  @param {String} actionName
  @param {Hash} options
*/
EmberHandlebars.registerHelper('action', function(actionName, options) {
  var hash = options.hash || {},
      eventName = hash.on || "click",
      view = options.data.view,
      target, context, controller;

  if (view.isVirtual) { view = view.get('parentView'); }

  if (hash.target) {
    target = getPath(this, hash.target, options);
  } else if (controller = options.data.keywords.controller) {
    target = get(controller, 'target');
  }

  target = target || view;

  context = hash.context ? getPath(this, hash.context, options) : options.contexts[0];

  var actionId = ActionHelper.registerAction(actionName, eventName, target, view, context);
  return new EmberHandlebars.SafeString('data-ember-action="' + actionId + '"');
});
