var SimpleDOM = require('simple-dom');
var buildOwner = require('./build-owner');

module.exports = function(moduleName) {
  QUnit.module(moduleName, {
    beforeEach: function() {
        this.setupComponentTest = setupComponentTest;
        this.render = render;

    },

    afterEach: function() {
      // tear down to avoid test leakage
    }
  });
};

function setupComponentTest() {
  var module = this;
  
  module.owner = buildOwner({ resolve: function(){} });

  var hasRendered = false;
  var OutletView = module.owner._lookupFactory('view:-outlet');
  var OutletTemplate = module.owner.lookup('template:-outlet');
  var toplevelView = module.component = OutletView.create();
  var hasOutletTemplate = !!OutletTemplate;
  var outletState = {
    render: {
      owner: module.owner || undefined,
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
}

function render(template) {
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
  this._element = element = document.querySelector('#ember-testing > .ember-view');
};
