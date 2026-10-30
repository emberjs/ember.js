import { computed, set } from '@ember/object';
import ComputedProperty, { empty, expandProperties, sum } from '@ember/object/computed';
import { dependentKeyCompat } from '@ember/object/compat';
import { descriptorForProperty } from '@ember/-internals/metal/lib/decorator';
import { DEPRECATIONS } from '@ember/-internals/deprecations';
import { tracked } from '@glimmer/tracking';
import { AbstractTestCase, expectDeprecation, moduleFor, testUnless } from 'internal-test-helpers';

/*
  The classic computed property API, which the `EMBER_DROP_CLASSIC_FEATURES`
  build flag removes. These tests run only in builds without the flag.
*/
if (!import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'without EMBER_DROP_CLASSIC_FEATURES: computed',
    class extends AbstractTestCase {
      ['@test computed recomputes when a dependent key changes'](assert) {
        class Person {
          firstName = 'Tom';
          lastName = 'Dale';

          @computed('firstName', 'lastName')
          get fullName() {
            assert.step('compute');
            return `${this.firstName} ${this.lastName}`;
          }
        }

        let person = new Person();

        assert.strictEqual(person.fullName, 'Tom Dale');
        assert.strictEqual(person.fullName, 'Tom Dale');
        assert.verifySteps(['compute'], 'the value is cached');

        set(person, 'firstName', 'Yehuda');

        assert.strictEqual(person.fullName, 'Yehuda Dale');
        assert.verifySteps(['compute']);
      }

      ['@test the descriptor of a computed property is a ComputedProperty'](assert) {
        class Person {
          @computed
          get name() {
            return 'Tom';
          }
        }

        // With stable decorators, the first instance finalizes the class.
        let person = new Person();

        assert.strictEqual(person.name, 'Tom');
        assert.ok(descriptorForProperty(Person.prototype, 'name') instanceof ComputedProperty);
      }

      ['@test dependentKeyCompat lets a computed property depend on a native getter'](assert) {
        class Person {
          @tracked firstName = 'Tom';

          @dependentKeyCompat
          get greeting() {
            return `Hello, ${this.firstName}`;
          }

          @computed('greeting')
          get loudGreeting() {
            return this.greeting.toUpperCase();
          }
        }

        let person = new Person();

        assert.strictEqual(person.loudGreeting, 'HELLO, TOM');

        person.firstName = 'Yehuda';

        assert.strictEqual(person.loudGreeting, 'HELLO, YEHUDA');
      }

      ['@test expandProperties expands brace expansions'](assert) {
        expandProperties('person.{firstName,lastName}', (key) => assert.step(key));

        assert.verifySteps(['person.firstName', 'person.lastName']);
      }

      [`${testUnless(DEPRECATIONS.DEPRECATE_EMBER_UTILS.isRemoved)} @test empty works`](assert) {
        expectDeprecation(
          /`empty` from `@ember\/object\/computed` is deprecated/,
          DEPRECATIONS.DEPRECATE_EMBER_UTILS.isEnabled
        );
        expectDeprecation(
          /`isEmpty` from `@ember\/utils` is deprecated/,
          DEPRECATIONS.DEPRECATE_EMBER_UTILS.isEnabled
        );

        class List {
          items = [];

          @empty('items')
          isEmpty;
        }

        let list = new List();

        assert.true(list.isEmpty);

        set(list, 'items', [1]);

        assert.false(list.isEmpty);
      }

      [`${testUnless(DEPRECATIONS.DEPRECATE_ARRAY_COMPUTED_MACROS.isRemoved)} @test sum works`](
        assert
      ) {
        expectDeprecation(
          /`sum` from `@ember\/object\/computed` is deprecated/,
          DEPRECATIONS.DEPRECATE_ARRAY_COMPUTED_MACROS.isEnabled
        );

        class Cart {
          prices = [1, 2];

          @sum('prices')
          total;
        }

        let cart = new Cart();

        assert.strictEqual(cart.total, 3);

        set(cart, 'prices', [1, 2, 3]);

        assert.strictEqual(cart.total, 6);
      }
    }
  );
}
