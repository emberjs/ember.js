import {
  moduleFor,
  ApplicationTestCase,
  ModuleBasedTestResolver,
  RenderingTestCase,
} from 'internal-test-helpers';
import { DEBUG } from '@glimmer/env';
import Engine from '@ember/engine';
import Controller from '@ember/controller';
import { precompileTemplate } from '@ember/template-compilation';

const OUTLET_ASSERTION =
  '{{outlet}} may only be used in route templates. It cannot be used in component templates or non-routable engine templates.';

moduleFor(
  '{{outlet}} assertion tests - component context',
  class extends RenderingTestCase {
    ['@test it asserts when {{outlet}} is used in a component template'](assert) {
      if (!DEBUG) {
        assert.ok(true, 'Assertions disabled in production builds.');
        return;
      }

      this.add('template:components/foo-bar', precompileTemplate('{{outlet}}'));

      assert.throwsAssertion(() => {
        this.render('<FooBar />');
      }, OUTLET_ASSERTION);
    }
  }
);

moduleFor(
  '{{outlet}} assertion tests - route context',
  class extends ApplicationTestCase {
    ['@test valid {{outlet}} in route templates continues to work'](assert) {
      this.add('template:application', precompileTemplate('{{outlet}}'));
      this.add('template:index', precompileTemplate('Hello from route template'));

      return this.visit('/').then(() => {
        assert.strictEqual(this.element.textContent.trim(), 'Hello from route template');
      });
    }
  }
);

moduleFor(
  '{{outlet}} assertion tests - non-routable engine',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);

      let engineRegistrations = (this.engineRegistrations = {});

      this.add(
        'engine:chat',
        class extends Engine {
          router = null;
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);

            Object.keys(engineRegistrations).forEach((fullName) => {
              this.register(fullName, engineRegistrations[fullName]);
            });
          }
        }
      );

      this.add('template:index', precompileTemplate('{{mount "chat"}}'));
    }

    ['@test it asserts when {{outlet}} is used in a non-routable engine'](assert) {
      if (!DEBUG) {
        assert.ok(true, 'Assertions disabled in production builds.');
        return;
      }

      this.engineRegistrations['template:application'] = precompileTemplate('{{outlet}}');
      this.engineRegistrations['controller:application'] = class extends Controller {};

      return assert.rejectsAssertion(this.visit('/'), OUTLET_ASSERTION);
    }
  }
);
