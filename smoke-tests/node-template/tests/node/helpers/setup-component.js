import SimpleDOM from 'simple-dom';
import Component from 'ember-source/@ember/component/index.js';
import { set } from 'ember-source/@ember/object/index.js';
import { run } from 'ember-source/@ember/runloop/index.js';
import { precompile } from 'ember-source/ember-template-compiler/index.js';
import { createTemplateFactory } from 'ember-source/@ember/template-factory/index.js';
import buildOwner from './build-owner.js';

function compile(templateString, options) {
  let templateSpec = precompile(templateString, options);
  return createTemplateFactory(JSON.parse(templateSpec));
}

export default function (hooks) {
  hooks.beforeEach(function () {
    this.compile = compile;
    this.Ember = { Component, set };
    this.Component = Component;

    this.run = run;

    setupComponentTest.call(this);
  });

  hooks.afterEach(function () {
    let module = this;

    if (this.component) {
      this.run(function () {
        module.component.destroy();
      });

      this.component = null;
    }

    this.run(this.owner, 'destroy');
    this.owner = null;
  });
}

function setupComponentTest() {
  let module = this;

  module.element = new SimpleDOM.Document();
  module.owner = buildOwner({ resolve: function () {} });
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

  this.run(function () {
    module.component.setOutletState(module._outletState);
  });

  module.render = render;
  module.serializeElement = serializeElement;
  module.set = function (property, value) {
    module.run(function () {
      set(module, property, value);
    });
  };
}

function render(_template) {
  let module = this;
  let templateFactory = this.compile(_template);

  let stateToRender = {
    owner: this.owner,
    name: 'index',
    controller: this,
    model: undefined,
    template: templateFactory(this.owner),
  };

  stateToRender.name = 'index';
  this._outletState.outlets.main = { render: stateToRender, outlets: {} };

  this.run(function () {
    module.component.setOutletState(module._outletState);
  });

  if (!this._hasRendered) {
    this.run(function () {
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
