import EmberObject, { get, set } from '@ember/object';
import CoreObject from '@ember/object/core';
import { getOwner } from '@ember/owner';
import { isDestroyed, isDestroying } from '@ember/destroyable';
import { AbstractTestCase, buildOwner, moduleFor, runDestroy } from 'internal-test-helpers';

/*
  The public `EmberObject` and `CoreObject` exports, which the
  `EMBER_DROP_CLASSIC_FEATURES` build flag removes. These tests run only in
  builds without the flag.
*/
if (!import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'without EMBER_DROP_CLASSIC_FEATURES: EmberObject',
    class extends AbstractTestCase {
      ['@test EmberObject extends CoreObject'](assert) {
        let object = EmberObject.create();

        assert.ok(object instanceof EmberObject);
        assert.ok(object instanceof CoreObject);

        runDestroy(object);
      }

      ['@test extend and create define and configure a class'](assert) {
        let Person = EmberObject.extend({
          name: 'Tom',

          greet() {
            return `hello, ${this.name}`;
          },
        });

        let person = Person.create({ name: 'Yehuda' });

        assert.strictEqual(person.greet(), 'hello, Yehuda');

        runDestroy(person);
      }

      ['@test init runs after the create properties are set'](assert) {
        class Person extends EmberObject {
          init() {
            super.init(...arguments);
            assert.step(`init ${this.name}`);
          }
        }

        let person = Person.create({ name: 'Tom' });

        assert.verifySteps(['init Tom']);

        runDestroy(person);
      }

      ['@test init can read the owner'](assert) {
        let owner = buildOwner();

        owner.register(
          'thing:main',
          class extends EmberObject {
            init() {
              super.init(...arguments);
              assert.strictEqual(getOwner(this), owner, 'the owner is set in init');
            }
          }
        );

        owner.lookup('thing:main');

        runDestroy(owner);
      }

      ['@test get and set work as methods and as functions'](assert) {
        let person = EmberObject.create({ name: 'Tom' });

        assert.strictEqual(person.get('name'), 'Tom');
        assert.strictEqual(get(person, 'name'), 'Tom');

        person.set('name', 'Yehuda');
        assert.strictEqual(person.name, 'Yehuda');

        set(person, 'name', 'Godfrey');
        assert.strictEqual(person.name, 'Godfrey');

        runDestroy(person);
      }

      ['@test reopen adds to the class'](assert) {
        let Person = EmberObject.extend();

        Person.reopen({
          greet() {
            return 'hello';
          },
        });

        let person = Person.create();

        assert.strictEqual(person.greet(), 'hello');

        runDestroy(person);
      }

      ['@test destroy runs willDestroy and sets the destroy flags'](assert) {
        class Person extends EmberObject {
          willDestroy() {
            super.willDestroy(...arguments);
            assert.step('willDestroy');
          }
        }

        let person = Person.create();

        assert.false(person.isDestroying);
        assert.false(person.isDestroyed);

        runDestroy(person);

        assert.verifySteps(['willDestroy']);
        assert.true(person.isDestroying);
        assert.true(person.isDestroyed);
        assert.true(isDestroying(person));
        assert.true(isDestroyed(person));
      }
    }
  );

  moduleFor(
    'without EMBER_DROP_CLASSIC_FEATURES: CoreObject',
    class extends AbstractTestCase {
      ['@test extend, create and init work on CoreObject'](assert) {
        let Thing = CoreObject.extend({
          init() {
            this._super(...arguments);
            assert.step(`init ${this.name}`);
          },
        });

        let thing = Thing.create({ name: 'core' });

        assert.verifySteps(['init core']);
        assert.ok(thing instanceof CoreObject);
        assert.notOk(thing instanceof EmberObject);

        runDestroy(thing);
      }
    }
  );
}
