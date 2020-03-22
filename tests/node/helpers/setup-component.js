'use strict';

const path = require('path');
const SimpleDOM = require('simple-dom');
const buildOwner = require('./build-owner');

const distPath = path.join(__dirname, '../../../dist');
const emberPath = path.join(distPath, 'tests/ember');
const templateCompilerPath = path.join(distPath, 'ember-template-compiler');

function clearEmber() {
  delete global.Ember;

  // clear the previously cached version of this module
  delete require.cache[emberPath + '.js'];
  delete require.cache[templateCompilerPath + '.js'];
}

module.exports = function(hooks) {
  hooks.beforeEach(function() {
    let precompile = require(templateCompilerPath).precompile;
    this.compile = function compile(templateString, options) {
      let templateSpec = precompile(templateString, options);
      let template = new Function('return ' + templateSpec)();

      return this.Ember.HTMLBars.template(template);
    };

    let Ember = (this.Ember = require(emberPath));

    Ember.testing = true;
    this.run = Ember.run;

    setupComponentTest.call(this);
  });

  hooks.afterEach(function() {
    let module = this;

    if (this.component) {
      this.run(function() {
        module.component.destroy();
      });

      this.component = null;
    }

    this.run(this.owner, 'destroy');
    this.owner = null;
    this.Ember = null;

    clearEmber();
  });
};

function setupComponentTest() {
  let module = this;

  module.element = new SimpleDOM.Document();
  module.owner = buildOwner(this.Ember, { resolve: function() {} });
  module.owner.register('service:-document', new SimpleDOM.Document(), {
    instantiate: false,
  });

  this._hasRendered = false;
  let OutletView = module.owner.factoryFor('view:-outlet');
  let outletTemplateFactory = module.owner.lookup('template:-outlet');
  module.component = OutletView.create();
  this._outletState = {
    render: {
      owner: module.owner || undefined,
      into: undefined,
      outlet: 'main',
      name: 'application',
      controller: module,
      model: undefined,
      template: outletTemplateFactory(module.owner),
    },

    outlets: {},
  };

  this.run(function() {
    module.component.setOutletState(module._outletState);
  });

  module.render = render;
  module.serializeElement = serializeElement;
  module.set = function(property, value) {
    module.run(function() {
      module.Ember.set(module, property, value);
    });
  };
}

function render(_template) {
  let module = this;
  let templateFactory = this.compile(_template);

  let stateToRender = {
    owner: this.owner,
    into: undefined,
    outlet: 'main',
    name: 'index',
    controller: this,
    model: undefined,
    template: templateFactory(this.owner),
  };

  stateToRender.name = 'index';
  this._outletState.outlets.main = { render: stateToRender, outlets: {} };

  this.run(function() {
    module.component.setOutletState(module._outletState);
  });

  if (!this._hasRendered) {
    this.run(function() {
      module.component.appendTo(module.element);
    });
    this._hasRendered = true;
  }

  return this.serializeElement();
}

function serializeElement() {
  let serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);

  return serializer.serialize(this.element);
}
