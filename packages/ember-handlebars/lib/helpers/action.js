require('ember-handlebars/ext');

var EmberHandlebars = Ember.Handlebars, getPath = Ember.Handlebars.getPath;

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

      if (Ember.StateManager && Ember.StateManager.detectInstance(target)) {
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

EmberHandlebars.registerHelper('action', function(actionName, options) {
  var hash = options.hash || {},
      eventName = hash.on || "click",
      view = options.data.view,
      target, context;

  if (view.isVirtual) { view = view.get('parentView'); }
  target = hash.target ? getPath(this, hash.target) : view;
  context = options.contexts[0];

  var actionId = ActionHelper.registerAction(actionName, eventName, target, view, context);
  return new EmberHandlebars.SafeString('data-ember-action="' + actionId + '"');
});
