require('ember-handlebars/ext');

var EmberHandlebars = Ember.Handlebars, getPath = Ember.Handlebars.getPath;

var ActionHelper = EmberHandlebars.ActionHelper = {};

ActionHelper.registerAction = function(actionName, eventName, target, view) {
  var actionId = (++jQuery.uuid).toString(),
      existingHandler = view[eventName];

  function handler(event) {
    if (Ember.$(event.target).closest('[data-ember-action]').attr('data-ember-action') === actionId) {
      if ('function' === typeof target.send) {
        return target.send(actionName);
      } else {
        return target[actionName](event);
      }
    }
  }

  if (existingHandler) {
    view[eventName] = function(event) {
      var ret = handler.call(view, event);
      return ret !== false ? existingHandler.call(view, event) : ret;
    };
  } else {
    view[eventName] = handler;
  }

  view.reopen({
    rerender: function() {
      if (existingHandler) {
        view[eventName] = existingHandler;
      } else {
        view[eventName] = null;
      }
      return this._super();
    }
  });

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
