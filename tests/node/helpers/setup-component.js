'use strict';

const SimpleDOM = require('simple-dom');
const buildOwner = require('./build-owner');
const { loadEmberModules } = require('./ember-esm');

module.exports = function (hooks) {
  hooks.beforeEach(async function () {
    let m = await loadEmberModules();
    this._m = m;

    setupComponentTest.call(this);
  });

  hooks.afterEach(function () {
    let module = this;

    if (this.component) {
      this._m.run(function () {
        module.component.destroy();
      });

      this.component = null;
    }

    this._m.run(this.owner, 'destroy');
    this.owner = null;
    this._m = null;
  });
};

function setupComponentTest() {
  let module = this;
  let m = this._m;

  module.element = new SimpleDOM.Document();
  module.owner = buildOwner(m, { resolve: function () {} });
  module.owner.register('service:-document', new SimpleDOM.Document(), {
    instantiate: false,
  });

  this._hasRendered = false;
  let OutletView = module.owner.factoryFor('view:-outlet');
  let outletTemplateFactory = module.owner.lookup('template:-outlet');
  let environment = module.owner.lookup('-environment:main');
  module.component = OutletView.create({ environment, template: outletTemplateFactory });
  this._outletState = {
    render: {
      owner: module.owner || undefined,
      name: 'application',
      controller: module,
      model: undefined,
      template: outletTemplateFactory(module.owner),
    },

    outlets: {},
  };

  m.run(function () {
    module.component.setOutletState(module._outletState);
  });

  module.render = render;
  module.serializeElement = serializeElement;
  module.set = function (property, value) {
    module._m.run(function () {
      module[property] = value;
    });
  };

  // Expose Component for tests that reference this.Ember.Component
  module.Ember = { Component: m.Component };
}

function render(_template) {
  let module = this;
  let templateFactory = this._m.compile(_template);

  let stateToRender = {
    owner: this.owner,
    name: 'index',
    controller: this,
    model: undefined,
    template: templateFactory(this.owner),
  };

  stateToRender.name = 'index';
  this._outletState.outlets.main = { render: stateToRender, outlets: {} };

  this._m.run(function () {
    module.component.setOutletState(module._outletState);
  });

  if (!this._hasRendered) {
    this._m.run(function () {
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
