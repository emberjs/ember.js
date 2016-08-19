import { context } from 'ember-environment';
import isEnabled from 'ember-metal/features';
import run from 'ember-metal/run_loop';
import Engine from 'ember-application/system/engine';
import EmberObject from 'ember-runtime/system/object';
import { privatize as P } from 'container/registry';
import { verifyInjection, verifyRegistration } from '../test-helpers/registry-check';

let engine;
let originalLookup = context.lookup;
let lookup;

QUnit.module('Ember.Engine', {
  setup() {
    lookup = context.lookup = {};
    engine = run(() => Engine.create());
  },

  teardown() {
    context.lookup = originalLookup;
    if (engine) {
      run(engine, 'destroy');
    }
  }
});

QUnit.test('acts like a namespace', function() {
  engine = run(() => lookup.TestEngine = Engine.create());

  engine.Foo = EmberObject.extend();
  equal(engine.Foo.toString(), 'TestEngine.Foo', 'Classes pick up their parent namespace');
});

QUnit.test('builds a registry', function() {
  strictEqual(engine.resolveRegistration('application:main'), engine, `application:main is registered`);
  deepEqual(engine.registeredOptionsForType('component'), { singleton: false }, `optionsForType 'component'`);
  deepEqual(engine.registeredOptionsForType('view'), { singleton: false }, `optionsForType 'view'`);
  verifyRegistration(engine, 'controller:basic');
  verifyInjection(engine, 'view', '_viewRegistry', '-view-registry:main');
  verifyInjection(engine, 'route', '_topLevelViewTemplate', 'template:-outlet');
  verifyInjection(engine, 'view:-outlet', 'namespace', 'application:main');

  verifyInjection(engine, 'controller', 'target', 'router:main');
  verifyInjection(engine, 'controller', 'namespace', 'application:main');

  verifyInjection(engine, 'router', '_bucketCache', P`-bucket-cache:main`);
  verifyInjection(engine, 'route', '_bucketCache', P`-bucket-cache:main`);
  verifyInjection(engine, 'controller', '_bucketCache', P`-bucket-cache:main`);

  verifyInjection(engine, 'route', 'router', 'router:main');

  verifyRegistration(engine, 'component:-text-field');
  verifyRegistration(engine, 'component:-text-area');
  verifyRegistration(engine, 'component:-checkbox');
  verifyRegistration(engine, 'component:link-to');

  verifyRegistration(engine, 'service:-routing');
  verifyInjection(engine, 'service:-routing', 'router', 'router:main');

  // DEBUGGING
  verifyRegistration(engine, 'resolver-for-debugging:main');
  verifyInjection(engine, 'container-debug-adapter:main', 'resolver', 'resolver-for-debugging:main');
  verifyInjection(engine, 'data-adapter:main', 'containerDebugAdapter', 'container-debug-adapter:main');
  verifyRegistration(engine, 'container-debug-adapter:main');
  verifyRegistration(engine, 'component-lookup:main');

  if (isEnabled('ember-glimmer')) {
    verifyInjection(engine, 'service:-dom-changes', 'document', 'service:-document');
    verifyInjection(engine, 'service:-dom-tree-construction', 'document', 'service:-document');
    verifyRegistration(engine, 'view:-outlet');
    verifyRegistration(engine, P`template:components/-default`);
    verifyRegistration(engine, 'template:-outlet');
    verifyInjection(engine, 'view:-outlet', 'template', 'template:-outlet');
    verifyInjection(engine, 'template', 'env', 'service:-glimmer-environment');
    deepEqual(engine.registeredOptionsForType('helper'), { instantiate: false }, `optionsForType 'helper'`);
  } else {
    deepEqual(engine.registeredOptionsForType('template'), { instantiate: false }, `optionsForType 'template'`);

    verifyInjection(engine, 'renderer', 'dom', 'service:-dom-helper');
    verifyInjection(engine, 'service:-dom-helper', 'document', 'service:-document');

    verifyRegistration(engine, 'view:-outlet');
    verifyRegistration(engine, 'template:-outlet');
    verifyRegistration(engine, 'view:toplevel');
  }
});
