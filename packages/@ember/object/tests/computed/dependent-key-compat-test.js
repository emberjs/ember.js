import EmberObject, { computed, observer } from '@ember/object';
import { tracked } from '@ember/-internals/metal';
import { dependentKeyCompat } from '@ember/object/compat';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';

moduleFor(
  'dependentKeyCompat',
  class extends AbstractTestCase {
    '@test it works with computed properties'(assert) {
      class Person {
        @tracked firstName = 'Tom';
        @tracked lastName = 'Dale';

        @dependentKeyCompat
        get givenName() {
          return this.firstName;
        }

        @computed('givenName', 'lastName')
        get fullName() {
          return `${this.givenName} ${this.lastName}`;
        }
      }

      let tom = new Person();

      assert.equal(tom.fullName, 'Tom Dale');

      tom.firstName = 'Thomas';

      assert.equal(tom.fullName, 'Thomas Dale');
    }

    '@test it works with classic classes'(assert) {
      let Person = EmberObject.extend({
        firstName: tracked({ value: 'Tom' }),
        lastName: tracked({ value: 'Dale' }),

        givenName: dependentKeyCompat({
          get() {
            return this.firstName;
          },
        }),

        fullName: computed('givenName', 'lastName', function () {
          return `${this.givenName} ${this.lastName}`;
        }),
      });

      let tom = Person.create();

      assert.equal(tom.fullName, 'Tom Dale');

      tom.firstName = 'Thomas';

      assert.equal(tom.fullName, 'Thomas Dale');
    }

    async '@test it works with async observers'(assert) {
      let count = 0;

      let Person = EmberObject.extend({
        firstName: tracked({ value: 'Tom' }),
        lastName: tracked({ value: 'Dale' }),

        givenName: dependentKeyCompat({
          get() {
            return this.firstName;
          },
        }),

        givenNameObserver: observer({
          dependentKeys: ['givenName'],
          fn() {
            count++;
          },
          sync: false,
        }),
      });

      let tom = Person.create();

      assert.equal(count, 0);

      // check the alias, and bootstrap it
      assert.equal(tom.givenName, 'Tom', 'alias works');

      tom.firstName = 'Thomas';
      await runLoopSettled();

      assert.equal(count, 1);

      tom.destroy();
    }

    '@test it does not work with sync observers'(assert) {
      let count = 0;

      let Person = EmberObject.extend({
        firstName: tracked({ value: 'Tom' }),
        lastName: tracked({ value: 'Dale' }),

        givenName: dependentKeyCompat({
          get() {
            return this.firstName;
          },
        }),

        givenNameObserver: observer({
          dependentKeys: ['givenName'],
          fn() {
            count++;
          },
          sync: true,
        }),
      });

      let tom = Person.create();

      assert.equal(count, 0);

      tom.firstName = 'Thomas';

      assert.equal(count, 0);

      tom.destroy();
    }
  }
);
