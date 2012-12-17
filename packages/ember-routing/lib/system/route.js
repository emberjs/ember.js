var get = Ember.get, set = Ember.set, classify = Ember.String.classify;

var DefaultView = Ember.View.extend(Ember._Metamorph);

Ember.Route = Ember.Object.extend({
  init: function() {
    var router = this.router;
    this._activeViews = router._activeViews;
    this.namespace = router.namespace;
  },

  /**
    @private

    This hook is the entry point for router.js
  */
  setup: function(context) {
    var container = this.router.container;

    var templateName = this.templateName,
        controller = container.lookup('controller:' + templateName);

    if (!controller) {
      if (context && context.isSCArray) {
        controller = Ember.ArrayController.extend({ content: context });
      } else if (context) {
        controller = Ember.ObjectController.extend({ content: context });
      } else {
        controller = Ember.Controller.extend();
      }

      container.register('controller', templateName, controller);
      controller = container.lookup('controller:' + templateName);
    }

    this.setupControllers(controller, context);
    this.renderTemplates(context);
  },

  deserialize: function(params) {
    return this.model(params);
  },

  serialize: function(model, params) {
    if (params.length !== 1) { return; }

    var name = params[0], object = {};
    object[name] = get(model, 'id');

    return object;
  },

  model: function(params) {
    var match, name, value;

    for (var prop in params) {
      if (match = prop.match(/^(.*)_id$/)) {
        name = match[1];
        value = params[prop];
      }
    }

    if (!name) { return; }

    var className = classify(name),
        namespace = this.namespace,
        modelClass = namespace[className];

    Ember.assert("You used the dynamic segment " + name + "_id in your router, but " + namespace + "." + className + " did not exist and you did not override your state's `model` hook.", modelClass);
    return modelClass.find(value);
  },

  setupControllers: function(controller, context) {
    if (controller) {
      controller.set('content', context);
    }
  },

  controller: function(name) {
    return this.router.container.lookup('controller:' + name);
  },

  renderTemplates: function(context) {
    this.render();
  },

  render: function(name, options) {
    var templateName = this.templateName,
        container = this.router.container,
        className = classify(templateName),
        view = container.lookup('view:' + templateName) || DefaultView.create();

    set(view, 'template', container.lookup('template:' + templateName));

    options = options || {};
    var into = options.into || 'application';
    var outlet = options.outlet || 'main';
    var controller = options.controller || templateName;

    if (typeof controller === 'string') {
      controller = container.lookup('controller:' + controller);
    }

    set(view, 'controller', controller);

    var parentView = this._activeViews[into];
    parentView.connectOutlet(outlet, view);
  }
});
