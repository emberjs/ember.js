import { context } from '@ember/-internals/environment';
import { run } from '@ember/runloop';
import Engine from '@ember/engine';
import { Object as EmberObject } from '@ember/-internals/runtime';
import {
  moduleFor,
  AbstractTestCase as TestCase,
  ModuleBasedTestResolver,
  verifyInjection,
  verifyRegistration,
} from 'internal-test-helpers';

let engine;
let originalLookup = context.lookup;

moduleFor(
  'Engine',
  class extends TestCase {
    constructor() {
      super();

      run(() => {
        engine = Engine.create({
          Resolver: ModuleBasedTestResolver,
        });
        context.lookup = { TestEngine: engine };
      });
    }

    teardown() {
      context.lookup = originalLookup;
      if (engine) {
        run(engine, 'destroy');
        engine = null;
      }
    }

    ['@test acts like a namespace'](assert) {
      engine.Foo = EmberObject.extend();
      assert.equal(
        engine.Foo.toString(),
        'TestEngine.Foo',
        'Classes pick up their parent namespace'
      );
    }

    ['@test builds a registry'](assert) {
      assert.strictEqual(
        engine.resolveRegistration('application:main'),
        engine,
        `application:main is registered`
      );
      assert.deepEqual(
        engine.registeredOptionsForType('component'),
        { singleton: false },
        `optionsForType 'component'`
      );
      assert.deepEqual(
        engine.registeredOptionsForType('view'),
        { singleton: false },
        `optionsForType 'view'`
      );
      verifyRegistration(assert, engine, 'controller:basic');
      verifyInjection(assert, engine, 'renderer', '_viewRegistry', '-view-registry:main');
      verifyInjection(assert, engine, 'view:-outlet', 'namespace', 'application:main');

      verifyRegistration(assert, engine, 'component:-text-field');
      verifyRegistration(assert, engine, 'component:-checkbox');
      verifyRegistration(assert, engine, 'component:link-to');

      verifyRegistration(assert, engine, 'component:textarea');

      verifyRegistration(assert, engine, 'service:-routing');

      // DEBUGGING
      verifyRegistration(assert, engine, 'resolver-for-debugging:main');
      verifyInjection(
        assert,
        engine,
        'container-debug-adapter:main',
        'resolver',
        'resolver-for-debugging:main'
      );
      verifyRegistration(assert, engine, 'container-debug-adapter:main');
      verifyRegistration(assert, engine, 'component-lookup:main');

      verifyRegistration(assert, engine, 'view:-outlet');
      verifyRegistration(assert, engine, 'template:-outlet');
      verifyInjection(assert, engine, 'view:-outlet', 'template', 'template:-outlet');
      assert.deepEqual(
        engine.registeredOptionsForType('helper'),
        { instantiate: false },
        `optionsForType 'helper'`
      );
    }
  }
);
