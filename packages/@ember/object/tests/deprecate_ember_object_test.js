import EmberObject, { computed, get, set } from '@ember/object';
import CoreObject from '@ember/object/core';
import { alias, readOnly, sort } from '@ember/object/computed';
import Service from '@ember/service';
import Controller from '@ember/controller';
import Route from '@ember/routing/route';
import { tracked } from '@glimmer/tracking';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '../../-internals/deprecations';

const { isEnabled, isRemoved } = DEPRECATIONS.DEPRECATE_EMBER_OBJECT;

/*
  The flag is a build-time value, so one build runs only one of the two
  modules below.
*/
const isDropped = Boolean(import.meta.env?.EMBER_DROP_EMBER_OBJECT);

function expectEmberObjectDeprecation(callback, message) {
  expectDeprecation(callback, message, isEnabled);
}

if (!isDropped) {
  moduleFor(
    'EmberObject deprecation',
    class extends AbstractTestCase {
      [`${testUnless(isRemoved)} @test a class that extends EmberObject is deprecated`](assert) {
        class Cart extends EmberObject {}

        expectEmberObjectDeprecation(() => {
          let cart = Cart.create({ currency: 'USD' });
          assert.strictEqual(cart.currency, 'USD');
        }, /`EmberObject` is deprecated/);

        expectEmberObjectDeprecation(() => EmberObject.create(), /`EmberObject` is deprecated/);
        expectEmberObjectDeprecation(() => CoreObject.create(), /`EmberObject` is deprecated/);
      }

      ['@test framework classes and their subclasses are not deprecated'](assert) {
        class Session extends Service {
          @tracked user = null;

          get isLoggedIn() {
            return Boolean(this.user);
          }
        }

        class Posts extends Route {}
        class PostsController extends Controller {}

        let session = Session.create();
        session.user = 'zoey';
        assert.true(session.isLoggedIn);

        let instances = [session, Service.create(), Posts.create(), PostsController.create()];
        assert.true(instances.every((instance) => instance instanceof EmberObject));
      }

      [`${testUnless(isRemoved)} @test the object model methods are deprecated on framework classes`](
        assert
      ) {
        let service = Service.create();

        expectEmberObjectDeprecation(
          () => service.set('count', 1),
          /The `set` method is deprecated/
        );
        expectEmberObjectDeprecation(() => {
          assert.strictEqual(service.get('count'), 1);
        }, /The `get` method is deprecated/);
        expectEmberObjectDeprecation(
          () => service.setProperties({ name: 'zoey' }),
          /The `setProperties` method is deprecated/
        );
        expectEmberObjectDeprecation(() => {
          assert.deepEqual(service.getProperties('name', 'count'), { name: 'zoey', count: 1 });
        }, /The `getProperties` method is deprecated/);
        expectEmberObjectDeprecation(
          () => service.incrementProperty('count'),
          /The `incrementProperty` method is deprecated/
        );
        expectEmberObjectDeprecation(
          () => service.decrementProperty('count'),
          /The `decrementProperty` method is deprecated/
        );
        expectEmberObjectDeprecation(
          () => service.toggleProperty('isOpen'),
          /The `toggleProperty` method is deprecated/
        );
        expectEmberObjectDeprecation(
          () => service.notifyPropertyChange('count'),
          /The `notifyPropertyChange` method is deprecated/
        );

        assert.strictEqual(service.count, 1);
        assert.true(service.isOpen);
      }

      ['@test the get and set functions are not deprecated'](assert) {
        let service = Service.create();

        set(service, 'count', 1);

        assert.strictEqual(get(service, 'count'), 1);
      }

      [`${testUnless(isRemoved)} @test an init method on a subclass of a framework class is deprecated`](
        assert
      ) {
        class Session extends Service {
          init() {
            super.init(...arguments);
            assert.step('init');
          }
        }

        class Child extends Session {}

        expectEmberObjectDeprecation(() => Session.create(), /The `init` method is deprecated/);
        expectEmberObjectDeprecation(() => Child.create(), /The `init` method is deprecated/);

        assert.verifySteps(['init', 'init']);
      }

      [`${testUnless(isRemoved)} @test computed and the computed macros are deprecated`](assert) {
        expectEmberObjectDeprecation(() => {
          class Session extends Service {
            @tracked user = 'zoey';

            @computed('user')
            get name() {
              return this.user;
            }
          }

          assert.strictEqual(Session.create().name, 'zoey');
        }, /`computed` is deprecated/);

        expectEmberObjectDeprecation(
          () => alias('user.name'),
          /The `alias` macro from `@ember\/object\/computed` is deprecated/
        );
        expectEmberObjectDeprecation(
          () => readOnly('user.name'),
          /The `readOnly` macro from `@ember\/object\/computed` is deprecated/
        );
        expectEmberObjectDeprecation(
          () => sort('items', 'sortKeys'),
          /The `sort` macro from `@ember\/object\/computed` is deprecated/
        );
      }
    }
  );
}

if (isDropped) {
  moduleFor(
    'EmberObject deprecation: EMBER_DROP_EMBER_OBJECT build flag',
    class extends AbstractTestCase {
      ['@test a class that extends EmberObject throws'](assert) {
        class Cart extends EmberObject {}

        assert.throws(() => Cart.create(), /`EmberObject` is not available/);
        assert.throws(() => EmberObject.create(), /`EmberObject` is not available/);
        assert.throws(() => CoreObject.create(), /`EmberObject` is not available/);
      }

      ['@test framework classes stay usable with native class features'](assert) {
        class Session extends Service {
          @tracked user = null;

          get isLoggedIn() {
            return Boolean(this.user);
          }
        }

        let session = Session.create();
        session.user = 'zoey';

        assert.true(session.isLoggedIn);

        set(session, 'user', null);

        assert.false(get(session, 'isLoggedIn'));
      }

      ['@test the object model methods throw'](assert) {
        let service = Service.create();

        assert.throws(() => service.get('count'), /The `get` method is not available/);
        assert.throws(() => service.set('count', 1), /The `set` method is not available/);
        assert.throws(
          () => service.setProperties({ count: 1 }),
          /The `setProperties` method is not available/
        );
        assert.throws(
          () => service.notifyPropertyChange('count'),
          /The `notifyPropertyChange` method is not available/
        );
      }

      ['@test an init method on a subclass of a framework class throws'](assert) {
        class Session extends Service {
          init() {
            super.init(...arguments);
          }
        }

        assert.throws(() => Session.create(), /The `init` method is not available/);
      }

      ['@test computed and the computed macros throw'](assert) {
        assert.throws(() => computed('user', function () {}), /`computed` is not available/);
        assert.throws(() => alias('user.name'), /The `alias` macro .* is not available/);
      }
    }
  );
}
