import { context } from 'ember-environment';
import { run } from 'ember-metal';
import Engine from '../../system/engine';
import { Object as EmberObject } from 'ember-runtime';
import { privatize as P } from 'container';
import {
  verifyInjection,
  verifyRegistration
} from '../test-helpers/registry-check';
import {
  moduleFor,
  AbstractTestCase as TestCase
} from 'internal-test-helpers';


let engine;
let originalLookup = context.lookup;
let lookup;

moduleFor('Engine', class extends TestCase {
  constructor() {
    super();

    lookup = context.lookup = {};
    engine = run(() => Engine.create());
  }

  teardown() {
    context.lookup = originalLookup;
    if (engine) {
      run(engine, 'destroy');
    }
  }

  ['@test acts like a namespace'](assert) {
    engine = run(() => lookup.TestEngine = Engine.create());

    engine.Foo = EmberObject.extend();
    assert.equal(engine.Foo.toString(), 'TestEngine.Foo', 'Classes pick up their parent namespace');
  }

  ['@test builds a registry'](assert) {
    assert.strictEqual(engine.resolveRegistration('application:main'), engine, `application:main is registered`);
    assert.deepEqual(engine.registeredOptionsForType('component'), { singleton: false }, `optionsForType 'component'`);
    assert.deepEqual(engine.registeredOptionsForType('view'), { singleton: false }, `optionsForType 'view'`);
    verifyRegistration(engine, 'controller:basic');
    verifyInjection(engine, 'view', '_viewRegistry', '-view-registry:main');
    verifyInjection(engine, 'route', '_topLevelViewTemplate', 'template:-outlet');
    verifyInjection(engine, 'view:-outlet', 'namespace', 'application:main');

    verifyInjection(engine, 'controller', 'target', 'router:main');
    verifyInjection(engine, 'controller', 'namespace', 'application:main');

    verifyInjection(engine, 'router', '_bucketCache', P`-bucket-cache:main`);
    verifyInjection(engine, 'route', '_bucketCache', P`-bucket-cache:main`);

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

    verifyInjection(engine, 'service:-dom-changes', 'document', 'service:-document');
    verifyInjection(engine, 'service:-dom-tree-construction', 'document', 'service:-document');
    verifyRegistration(engine, 'view:-outlet');
    verifyRegistration(engine, P`template:components/-default`);
    verifyRegistration(engine, 'template:-outlet');
    verifyInjection(engine, 'view:-outlet', 'template', 'template:-outlet');
    verifyInjection(engine, 'template', 'env', 'service:-glimmer-environment');
    assert.deepEqual(engine.registeredOptionsForType('helper'), { instantiate: false }, `optionsForType 'helper'`);
  }
});
