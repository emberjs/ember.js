import Application from 'ember-application/system/application';
import Engine from 'ember-application/system/engine';
import EmberObject from 'ember-runtime/system/object';
import { compile } from 'ember-htmlbars-template-compiler';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-htmlbars/component';
import Controller from 'ember-runtime/controllers/controller';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import run from 'ember-metal/run_loop';
import { OWNER, getOwner } from 'container/owner';
import isEnabled from 'ember-metal/features';
import { getEngineParent } from 'ember-application/system/engine-parent';
import { test } from 'internal-test-helpers/tests/skip-if-glimmer';

let App,
    app,
    appInstance,
    ChatEngine,
    chatEngineResolutions;

function commonSetup() {
  App = Application.extend({ router: null });

  let ChatEngineResolver = EmberObject.extend({
    resolve(fullName) {
      return chatEngineResolutions[fullName];
    }
  });

  ChatEngine = Engine.extend({
    router: null,
    Resolver: ChatEngineResolver
  });

  run(function() {
    app = App.create();
    app.register('engine:chat', ChatEngine);
    app.registerOptionsForType('template', { instantiate: false });
    app.registerOptionsForType('component', { singleton: false });
    app.register('component-lookup:main', ComponentLookup);

    appInstance = app.buildInstance();
    appInstance.setupRegistry();
  });
}

function commonTeardown() {
  runDestroy(appInstance);
  runDestroy(app);
  app = appInstance = null;
}

if (isEnabled('ember-application-engines')) {
  QUnit.module('mount keyword', {
    setup() {
      commonSetup();
    },

    teardown() {
      commonTeardown();
    }
  });

  test('asserts that only a single param is passed', function(assert) {
    assert.expect(1);

    let component = Component.extend({
      [OWNER]: appInstance,
      layout: compile('{{mount "chat" "extra"}}')
    }).create();

    expectAssertion(() => {
      runAppend(component);
    }, /The first argument of {{mount}} must be an engine name, e.g. {{mount "chat-engine"}}./i);
  });

  test('asserts that the engine name argument is quoted', function(assert) {
    assert.expect(1);

    let component = Component.extend({
      [OWNER]: appInstance,
      layout: compile('{{mount chat}}')
    }).create();

    expectAssertion(() => {
      runAppend(component);
    }, /The first argument of {{mount}} must be quoted, e.g. {{mount "chat-engine"}}./i);
  });

  test('asserts that the specified engine is registered', function(assert) {
    assert.expect(1);

    let component = Component.extend({
      [OWNER]: appInstance,
      layout: compile('{{mount "does-not-exist"}}')
    }).create();

    expectAssertion(() => {
      runAppend(component);
    }, /You used `{{mount 'does-not-exist'}}`, but the engine 'does-not-exist' can not be found./i);
  });

  test('boots an engine, instantiates its application controller, and renders its application template', function(assert) {
    assert.expect(3);

    chatEngineResolutions = {
      'template:application': compile('<h2>Chat here</h2>')
    };

    chatEngineResolutions['controller:application'] = Controller.extend({
      init: function() {
        this._super();

        assert.ok(true, 'engine\'s application controller has been instantiated');

        let engineInstance = getOwner(this);
        assert.strictEqual(getEngineParent(engineInstance), appInstance, 'engine instance has appInstance as its parent');
      }
    });

    let component = Component.extend({
      [OWNER]: appInstance,
      layout: compile('{{mount "chat"}}'),
      didInsertElement() {
        assert.equal(this.$().text(), 'Chat here', 'engine\'s application template has rendered properly');
      }
    }).create();

    runAppend(component);
  });
}
