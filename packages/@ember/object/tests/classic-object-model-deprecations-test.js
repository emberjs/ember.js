import EmberObject from '@ember/object';
import { internalExtend, internalReopen, internalReopenClass } from '@ember/object/core';
import Mixin, { createMixin } from '@ember/object/mixin';
import Application from '@ember/application';
import EmberRouter from '@ember/routing/router';
import { setDeprecationStagesConfig } from '@ember/debug';
import { emberVersionGte } from '@ember/-internals/deprecations';
import {
  moduleForDevelopment,
  AbstractTestCase,
  ModuleBasedTestResolver,
  runTask,
  testUnless,
} from 'internal-test-helpers';

const CLASSIC_IDS = [
  'deprecate-ember-object-extend',
  'deprecate-ember-object-reopen',
  'deprecate-ember-mixins',
];

// Under _OVERRIDE_DEPRECATION_VERSION removal simulation these APIs throw
// instead of warning (the test config replaces the harness's except list),
// so the warn-expecting tests are skipped — the standard pattern for tests
// of removed deprecations.
const REMOVAL_SIMULATED = emberVersionGte('8.0.0');

moduleForDevelopment(
  'classic object model deprecations',
  class extends AbstractTestCase {
    teardown() {
      setDeprecationStagesConfig(null);
    }

    ['@test the deprecations are available-stage: nothing fires by default'](assert) {
      expectNoDeprecation(() => {
        let Klass = EmberObject.extend({ someProp: 'value' });
        Klass.reopen({ otherProp: 'value' });
        Klass.reopenClass({ staticProp: 'value' });
        Mixin.create({ mixedIn: 'value' });
      });
      assert.ok(true, 'no deprecations fired');
    }

    [`${testUnless(REMOVAL_SIMULATED)} extend fires when enabled`]() {
      setDeprecationStagesConfig({ enable: CLASSIC_IDS });

      expectDeprecation(() => {
        EmberObject.extend({ someProp: 'value' });
      }, /The classic class definition API `\.extend\(\)` is deprecated/);
    }

    [`${testUnless(REMOVAL_SIMULATED)} extend fires for subclasses created with extend`]() {
      setDeprecationStagesConfig({ enable: CLASSIC_IDS });

      let Klass;
      expectDeprecation(() => {
        Klass = EmberObject.extend();
      }, /`\.extend\(\)` is deprecated/);

      expectDeprecation(() => {
        Klass.extend();
      }, /`\.extend\(\)` is deprecated/);
    }

    [`${testUnless(REMOVAL_SIMULATED)} reopen and reopenClass fire when enabled`]() {
      setDeprecationStagesConfig({ enable: CLASSIC_IDS });

      class Klass extends EmberObject {}

      expectDeprecation(() => {
        Klass.reopen({ someProp: 'value' });
      }, /The classic class API `\.reopen\(\)` is deprecated/);

      expectDeprecation(() => {
        Klass.reopenClass({ staticProp: 'value' });
      }, /The classic class API `\.reopenClass\(\)` is deprecated/);
    }

    [`${testUnless(REMOVAL_SIMULATED)} Mixin.create fires when enabled`]() {
      setDeprecationStagesConfig({ enable: CLASSIC_IDS });

      expectDeprecation(() => {
        Mixin.create({ mixedIn: 'value' });
      }, /Ember Mixins are deprecated/);
    }

    ['@test the internal aliases never fire'](assert) {
      setDeprecationStagesConfig({ enable: CLASSIC_IDS });

      expectNoDeprecation(() => {
        let Klass = internalExtend(EmberObject, { someProp: 'value' });
        internalReopen(Klass, { otherProp: 'value' });
        internalReopenClass(Klass, { staticProp: 'value' });
        createMixin({ mixedIn: 'value' });
        // instantiation applies the pending mixins (proto/applyMixin) and
        // must not fire either
        Klass.create().destroy();
      });
      assert.ok(true, 'no deprecations fired');
    }
  }
);

moduleForDevelopment(
  'classic object model deprecations: framework runtime paths',
  class extends AbstractTestCase {
    teardown() {
      setDeprecationStagesConfig(null);
      if (this.app) {
        runTask(() => this.app.destroy());
      }
    }

    // The regression net for ember's internal runtime uses of the classic
    // definition APIs: booting an app (autoboot re-extends the Router
    // internally), Router.map (reopenClass on the app's router), and
    // initializer registration (reopenClass on the app class) must not be
    // blamed on the app.
    ['@test autoboot, Router.map, and initializers fire nothing when enabled'](assert) {
      setDeprecationStagesConfig({ enable: CLASSIC_IDS });

      expectNoDeprecation(() => {
        class TestRouter extends EmberRouter {}
        TestRouter.map(function () {
          this.route('example');
        });

        class TestApplication extends Application {}
        TestApplication.initializer({
          name: 'test-initializer',
          initialize() {},
        });

        this.app = runTask(() =>
          TestApplication.create({
            rootElement: '#qunit-fixture',
            autoboot: true,
            router: null,
            Resolver: ModuleBasedTestResolver,
          })
        );
      });
      assert.ok(true, 'no deprecations fired');
    }
  }
);
