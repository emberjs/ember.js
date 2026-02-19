/**
 * ESM port of tests/node/helpers/setup-component.js
 *
 * Sets up a test context for rendering components without a real DOM,
 * using SimpleDOM.
 */
import SimpleDOM from 'simple-dom';
import Component from 'ember-source/@ember/component/index.js';
import { set } from 'ember-source/@ember/object/index.js';
import { run } from 'ember-source/@ember/runloop/index.js';
import { setTesting } from 'ember-source/@ember/debug/lib/testing.js';
import { precompile } from 'ember-source/ember-template-compiler/index.js';
import { createTemplateFactory } from 'ember-source/@ember/template-factory/index.js';
import { buildOwner } from './build-owner.js';

function compile(templateString, options) {
  let templateSpec = precompile(templateString, options);
  return createTemplateFactory(JSON.parse(templateSpec));
}

export async function createComponentContext() {
  setTesting(true);

  const ctx = {
    Component,
    compile,
    run,
    _hasRendered: false,
  };

  ctx.element = new SimpleDOM.Document();
  ctx.owner = buildOwner({ resolve: function () {} });
  ctx.owner.register('service:-document', new SimpleDOM.Document(), {
    instantiate: false,
  });

  let OutletView = ctx.owner.factoryFor('view:-outlet');
  let outletTemplateFactory = ctx.owner.lookup('template:-outlet');
  let environment = ctx.owner.lookup('-environment:main');
  ctx.component = OutletView.create({ environment, template: outletTemplateFactory });
  ctx._outletState = {
    render: {
      owner: ctx.owner || undefined,
      name: 'application',
      controller: ctx,
      model: undefined,
      template: outletTemplateFactory(ctx.owner),
    },
    outlets: {},
  };

  run(function () {
    ctx.component.setOutletState(ctx._outletState);
  });

  ctx.set = function (property, value) {
    run(function () {
      set(ctx, property, value);
    });
  };

  ctx.render = function (_template) {
    let templateFactory = ctx.compile(_template);

    let stateToRender = {
      owner: ctx.owner,
      name: 'index',
      controller: ctx,
      model: undefined,
      template: templateFactory(ctx.owner),
    };

    stateToRender.name = 'index';
    ctx._outletState.outlets.main = { render: stateToRender, outlets: {} };

    run(function () {
      ctx.component.setOutletState(ctx._outletState);
    });

    if (!ctx._hasRendered) {
      run(function () {
        ctx.component.appendTo(ctx.element);
      });
      ctx._hasRendered = true;
    }

    return ctx.serializeElement();
  };

  ctx.serializeElement = function () {
    let serializer = new SimpleDOM.HTMLSerializer(SimpleDOM.voidMap);
    return serializer.serialize(ctx.element);
  };

  ctx.destroy = function () {
    if (ctx.component) {
      run(function () {
        ctx.component.destroy();
      });
      ctx.component = null;
    }
    run(ctx.owner, 'destroy');
    ctx.owner = null;
    setTesting(false);
  };

  return ctx;
}
