import SimpleDOM from 'simple-dom';
import Component from 'ember-source/@ember/component/index.js';
import {
  capabilities,
  setComponentManager,
  setComponentTemplate,
} from 'ember-source/@ember/component/index.js';
import { set } from 'ember-source/@ember/object/index.js';
import { run } from 'ember-source/@ember/runloop/index.js';
import { precompile } from 'ember-source/ember-template-compiler/index.js';
import { createTemplateFactory } from 'ember-source/@ember/template-factory/index.js';
import { renderComponent } from 'ember-source/@ember/-internals/glimmer/index.js';
import buildOwner from './build-owner.js';

function compile(templateString, options) {
  let templateSpec = precompile(templateString, options);
  return createTemplateFactory(JSON.parse(templateSpec));
}

const RENDER_CONTEXT_CAPABILITIES = capabilities('3.13', {
  destructor: false,
  asyncLifecycleCallbacks: false,
});

const renderContextManager = {
  capabilities: RENDER_CONTEXT_CAPABILITIES,
  createComponent(definition) {
    return definition.context;
  },
  getContext(context) {
    return context;
  },
};

function contextComponentFor(templateFactory, context) {
  let definition = { context };
  setComponentManager(() => renderContextManager, definition);
  setComponentTemplate(templateFactory, definition);
  return definition;
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
  this.component = null;

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
  let definition = contextComponentFor(templateFactory, module);

  if (!this._hasRendered) {
    this.run(function () {
      module.component = renderComponent(definition, {
        into: module.element,
        owner: module.owner,
        env: { document: module.element, isInteractive: false },
        appendIntoTarget: true,
      });
    });
    this._hasRendered = true;
  }

  return this.serializeElement();
}

function serializeElement() {
  let serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);

  return serializer.serialize(this.element);
}
