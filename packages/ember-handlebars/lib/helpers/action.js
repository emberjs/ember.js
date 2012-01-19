require('ember-handlebars/ext');

var EmberHandlebars = Ember.Handlebars, getPath = Ember.Handlebars.getPath;

var ActionHelper = EmberHandlebars.ActionHelper = {};

ActionHelper.registerAction = function(actionName, eventName, target, view) {
  var actionId = (++jQuery.uuid).toString(),
      existingHandler = view[eventName],
      originalRerender = view.rerender,
      handler;

  if (existingHandler) {
    var handler = function(event) {
      if ($(event.target).closest('[data-ember-action]').attr('data-ember-action') === actionId) {
        return target[actionName](event);
      } else if (existingHandler) {
        return existingHandler.call(view, event);
      }
    };
  } else {
    var handler = function(event) {
      if ($(event.target).closest('[data-ember-action]').attr('data-ember-action') === actionId) {
        return target[actionName](event);
      }
    };
  }

  view[eventName] = handler;

  view.rerender = function() {
    if (existingHandler) {
      view[eventName] = existingHandler;
    } else {
      view[eventName] = null;
    }
    originalRerender.call(this);
  };

  return actionId;
};

EmberHandlebars.registerHelper('action', function(actionName, options) {
  var hash = options.hash || {},
      eventName = options.hash.on || "click",
      view = options.data.view,
      target;

  if (view.isVirtual) { view = view.get('parentView'); }
  target = options.hash.target ? getPath(this, options.hash.target) : view;

  var actionId = ActionHelper.registerAction(actionName, eventName, target, view);
  return new EmberHandlebars.SafeString('data-ember-action="' + actionId + '"');
});
