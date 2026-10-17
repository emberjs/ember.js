import EmberObject from '@ember/object/lib/ember-object';
import { computed, observer } from '@ember/object';
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
      let Person = class extends EmberObject {
        @tracked
        firstName = 'Tom';
        @tracked
        lastName = 'Dale';

        @dependentKeyCompat
        get givenName() {
          return this.firstName;
        }

        @computed('givenName', 'lastName')
        get fullName() {
          return `${this.givenName} ${this.lastName}`;
        }
      };

      let tom = Person.create();

      assert.equal(tom.fullName, 'Tom Dale');

      tom.firstName = 'Thomas';

      assert.equal(tom.fullName, 'Thomas Dale');
    }

    '@test a read of the getter does not hide a change from a computed property'(assert) {
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

      assert.strictEqual(tom.fullName, 'Tom Dale');

      tom.firstName = 'Thomas';

      assert.strictEqual(
        tom.givenName,
        'Thomas',
        'the getter is read before the computed property'
      );
      assert.strictEqual(tom.fullName, 'Thomas Dale');

      tom.firstName = 'Tomster';

      assert.strictEqual(tom.givenName, 'Tomster');
      assert.strictEqual(tom.givenName, 'Tomster', 'the getter is read two times');
      assert.strictEqual(tom.fullName, 'Tomster Dale');
    }

    '@test a read of the getter does not hide a change from a computed property on another object'(
      assert
    ) {
      class Person {
        @tracked firstName = 'Tom';

        @dependentKeyCompat
        get givenName() {
          return this.firstName;
        }
      }

      class Badge {
        person = new Person();

        @computed('person.givenName')
        get label() {
          return `Hello, ${this.person.givenName}`;
        }
      }

      let badge = new Badge();

      assert.strictEqual(badge.label, 'Hello, Tom');

      badge.person.firstName = 'Thomas';

      assert.strictEqual(badge.person.givenName, 'Thomas');
      assert.strictEqual(badge.label, 'Hello, Thomas');
    }

    '@test a read of the getter does not hide a change in classic classes'(assert) {
      let Person = class extends EmberObject {
        @tracked
        firstName = 'Tom';
        @tracked
        lastName = 'Dale';

        @dependentKeyCompat
        get givenName() {
          return this.firstName;
        }

        @computed('givenName', 'lastName')
        get fullName() {
          return `${this.givenName} ${this.lastName}`;
        }
      };

      let tom = Person.create();

      assert.strictEqual(tom.fullName, 'Tom Dale');

      tom.firstName = 'Thomas';

      assert.strictEqual(tom.givenName, 'Thomas');
      assert.strictEqual(tom.fullName, 'Thomas Dale');
    }

    '@test a computed property follows the properties that the getter reads now'(assert) {
      class Person {
        @tracked firstName = 'Tom';
        @tracked nickname = 'Tomster';
        @tracked useNickname = false;

        @dependentKeyCompat
        get givenName() {
          return this.useNickname ? this.nickname : this.firstName;
        }

        @computed('givenName')
        get greeting() {
          return `Hello, ${this.givenName}`;
        }
      }

      let tom = new Person();

      assert.strictEqual(tom.greeting, 'Hello, Tom');

      tom.useNickname = true;

      assert.strictEqual(tom.givenName, 'Tomster');
      assert.strictEqual(tom.greeting, 'Hello, Tomster');

      tom.nickname = 'Zoey';

      assert.strictEqual(tom.givenName, 'Zoey');
      assert.strictEqual(tom.greeting, 'Hello, Zoey');
    }

    async '@test a read of the getter does not hide a change from an async observer'(assert) {
      let Person = EmberObject.extend({
        firstName: tracked({ value: 'Tom' }),

        givenName: dependentKeyCompat({
          get() {
            return this.firstName;
          },
        }),

        givenNameObserver: observer({
          dependentKeys: ['givenName'],
          fn() {
            assert.step(`givenName changed to ${this.givenName}`);
          },
          sync: false,
        }),
      });

      let tom = Person.create();

      assert.strictEqual(tom.givenName, 'Tom');

      tom.firstName = 'Thomas';

      assert.strictEqual(tom.givenName, 'Thomas', 'the getter is read before the observer runs');

      await runLoopSettled();

      assert.verifySteps(['givenName changed to Thomas']);

      tom.destroy();
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
