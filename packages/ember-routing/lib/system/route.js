var get = Ember.get, set = Ember.set;

var DefaultView = Ember.View.extend(Ember._Metamorph);

Ember.Route = Ember.Object.extend({
  /**
    @private

    This hook is the entry point for router.js
  */
  setup: function(context) {
    var templateName = get(this, 'templateName'),
        controller = this.lookup('controller', templateName);

    this.setupControllers(controller, context);
    this.renderTemplates(context);
  },

  setupControllers: function(context) {

  },

  controller: function(name) {
    return this.lookup('controller', name);
  },

  renderTemplates: function(context) {
    this.render();
  },

  render: function(name, options) {
    var templateName = get(this, 'templateName');

    var view = this.lookup('view', templateName, function() {
      return DefaultView.create({ templateName: templateName });
    });

    options = options || {};
    var into = options.into || 'application';
    var outlet = options.outlet || 'main';
    var controller = options.controller || templateName;

    if (typeof controller === 'string') {
      controller = this.lookup('controller', controller);
    }

    set(view, 'controller', controller);

    var parentView = this.lookup('view', into);
    parentView.connectOutlet(outlet, view);
  },

  lookup: function(kind, name, callback) {
    var object = this._container[kind][name];

    if (!object && callback) {
      object = callback();
      this._container[kind][name] = object;
    }

    return object;
  }
});
