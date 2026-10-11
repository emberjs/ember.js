import EmberObject from '@ember/object';
import Mixin from '@ember/object/mixin';
import { DEPRECATIONS } from '@ember/-internals/deprecations';
import {
  INTERNAL_EXTEND,
  INTERNAL_REOPEN,
  INTERNAL_REOPEN_CLASS,
} from '@ember/-internals/utils/lib/internal-classic-class';
import {
  moduleFor,
  AbstractTestCase,
  expectDeprecation,
  expectNoDeprecation,
  testUnless,
} from 'internal-test-helpers';

const { isEnabled, isRemoved } = DEPRECATIONS.DEPRECATE_CLASSIC_CLASSES;

moduleFor(
  'Classic classes deprecation (RFC #1117)',
  class extends AbstractTestCase {
    [`${testUnless(isRemoved)} @test extend() is deprecated`](assert) {
      let Person;

      expectDeprecation(
        () => {
          Person = EmberObject.extend({ name: 'Tom' });
        },
        /`\.extend\(\)` creates a classic class, which is deprecated/,
        isEnabled
      );

      assert.equal(Person.create().name, 'Tom', 'the class still works');
    }

    [`${testUnless(
      isRemoved || DEPRECATIONS.DEPRECATE_MIXINS.isRemoved
    )} @test extend() is deprecated when applying a mixin`](assert) {
      let Greeter;

      expectDeprecation(
        () => {
          Greeter = Mixin.create({ greet: () => 'hi' });
        },
        /Using mixins is deprecated/,
        DEPRECATIONS.DEPRECATE_MIXINS.isEnabled
      );
      let Person;

      expectDeprecation(
        () => {
          Person = EmberObject.extend(Greeter);
        },
        /`\.extend\(\)` creates a classic class, which is deprecated/,
        isEnabled
      );

      assert.equal(Person.create().greet(), 'hi', 'the mixin was still applied');
    }

    [`${testUnless(isRemoved)} @test reopen() is deprecated`](assert) {
      let Person = class extends EmberObject {};

      expectDeprecation(
        () => {
          Person.reopen({ name: 'Tom' });
        },
        /`reopen` is part of the classic class system, which is deprecated/,
        isEnabled
      );

      assert.equal(Person.create().name, 'Tom', 'the property was still added');
    }

    [`${testUnless(isRemoved)} @test reopen() on an instance is deprecated`](assert) {
      let person = class extends EmberObject {}.create();

      expectDeprecation(
        () => {
          person.reopen({ name: 'Tom' });
        },
        /`reopen` is part of the classic class system, which is deprecated/,
        isEnabled
      );

      assert.equal(person.name, 'Tom', 'the property was still added');
    }

    [`${testUnless(isRemoved)} @test reopenClass() is deprecated`](assert) {
      let Person = class extends EmberObject {};

      expectDeprecation(
        () => {
          Person.reopenClass({ species: 'Homo sapiens' });
        },
        /`reopenClass` is part of the classic class system, which is deprecated/,
        isEnabled
      );

      assert.equal(Person.species, 'Homo sapiens', 'the static property was still added');
    }

    ['@test the internal methods do not deprecate, so Ember internals can build on them'](assert) {
      let Person;

      expectNoDeprecation(() => {
        Person = EmberObject[INTERNAL_EXTEND]({ name: 'Tom' });
        Person[INTERNAL_REOPEN]({ age: 5 });
        Person[INTERNAL_REOPEN_CLASS]({ species: 'Homo sapiens' });
      });

      let person = Person.create();

      assert.equal(person.name, 'Tom', 'the internal extend works');
      assert.equal(person.age, 5, 'the internal reopen works');
      assert.equal(Person.species, 'Homo sapiens', 'the internal reopenClass works');
    }

    ['@test native class syntax does not trigger the deprecation'](assert) {
      class Person extends EmberObject {
        name = 'Tom';
      }

      assert.equal(Person.create().name, 'Tom');
    }
  }
);
