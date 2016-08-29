var SimpleDOM = require('simple-dom');
var buildOwner = require('./build-owner');

module.exports = function(moduleName) {
  QUnit.module(moduleName, {
    beforeEach: function() {
        this.renderComponent = renderComponent
    },

    afterEach: function() {
      // tear down to avoid test leakage
    }
  });
};

function renderComponent() {
  var module = this;
  var context = this.context;
  
  module.owner = buildOwner();

  var hasRendered = false;
  var OutletView = module.container.lookupFactory('view:-outlet');
  var OutletTemplate = module.container.lookup('template:-outlet');
  var toplevelView = module.component = OutletView.create();
  var hasOutletTemplate = !!OutletTemplate;
  var outletState = {
    render: {
      owner: getOwner ? getOwner(module.container) : undefined,
      into: undefined,
      outlet: 'main',
      name: 'application',
      controller: module.context,
      ViewClass: undefined,
      template: OutletTemplate
    },

    outlets: { }
  };

  var element = document.getElementById('ember-testing');
  var templateId = 0;

  if (hasOutletTemplate) {
    Ember.run(() => {
      toplevelView.setOutletState(outletState);
    });
  }

  context.render = function(template) {
    if (!template) {
      throw new Error("in a component integration test you must pass a template to `render()`");
    }
    if (Ember.isArray(template)) {
      template = template.join('');
    }
    if (typeof template === 'string') {
      template = Ember.Handlebars.compile(template);
    }

    var templateFullName = 'template:-undertest-' + (++templateId);
    this.registry.register(templateFullName, template);
    var stateToRender = {
      owner: getOwner ? getOwner(module.container) : undefined,
      into: undefined,
      outlet: 'main',
      name: 'index',
      controller: module.context,
      ViewClass: undefined,
      template: module.container.lookup(templateFullName),
      outlets: { }
    };

    if (hasOutletTemplate) {
      stateToRender.name = 'index';
      outletState.outlets.main = { render: stateToRender, outlets: {} };
    } else {
      stateToRender.name = 'application';
      outletState = { render: stateToRender, outlets: {} };
    }

    Ember.run(() => {
      toplevelView.setOutletState(outletState);
    });

    if (!hasRendered) {
      Ember.run(module.component, 'appendTo', new SimpleDOM.Document());
      hasRendered = true;
    }

    // ensure the element is based on the wrapping toplevel view
    // Ember still wraps the main application template with a
    // normal tagged view
    context._element = element = document.querySelector('#ember-testing > .ember-view');
  };

  context.$ = function(selector) {
    // emulates Ember internal behavor of `this.$` in a component
    // https://github.com/emberjs/ember.js/blob/v2.5.1/packages/ember-views/lib/views/states/has_element.js#L18
    return selector ? Ember.$(selector, element) : Ember.$(element);
  };

  context.set = function(key, value) {
    var ret = Ember.run(function() {
      return Ember.set(context, key, value);
    });

    if (hasEmberVersion(2,0)) {
      return ret;
    }
  };

  context.setProperties = function(hash) {
    var ret = Ember.run(function() {
      return Ember.setProperties(context, hash);
    });

    if (hasEmberVersion(2,0)) {
      return ret;
    }
  };

  context.get = function(key) {
    return Ember.get(context, key);
  };

  context.getProperties = function() {
    var args = Array.prototype.slice.call(arguments);
    return Ember.getProperties(context, args);
  };

  context.clearRender = function() {
    Ember.run(function() {
      toplevelView.setOutletState({
        render: {
          owner: module.container,
          into: undefined,
          outlet: 'main',
          name: 'application',
          controller: module.context,
          ViewClass: undefined,
          template: undefined
        },
        outlets: {}
      });
    });
  };
}