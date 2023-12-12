import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { cached, tracked } from '../..';

moduleFor(
  '@cached decorator: get',
  class extends AbstractTestCase {
    '@test it works'() {
      let assert = this.assert;

      class Person {
        @tracked firstName = 'Jen';
        @tracked lastName = 'Weber';

        @cached
        get fullName() {
          let fullName = `${this.firstName} ${this.lastName}`;

          assert.step(fullName);
          return fullName;
        }
      }

      let person = new Person();

      assert.verifySteps([], 'getter is not called after class initialization');

      assert.strictEqual(person.fullName, 'Jen Weber');
      assert.verifySteps(['Jen Weber'], 'getter was called after property access');

      assert.strictEqual(person.fullName, 'Jen Weber');
      assert.verifySteps([], 'getter was not called again after repeated property access');

      person.firstName = 'Kenneth';
      assert.verifySteps([], 'changing a property does not trigger an eager re-computation');

      assert.strictEqual(person.fullName, 'Kenneth Weber');
      assert.verifySteps(['Kenneth Weber'], 'accessing the property triggers a re-computation');

      assert.strictEqual(person.fullName, 'Kenneth Weber');
      assert.verifySteps([], 'getter was not called again after repeated property access');

      person.lastName = 'Larsen';
      assert.verifySteps([], 'changing a property does not trigger an eager re-computation');

      assert.strictEqual(person.fullName, 'Kenneth Larsen');
      assert.verifySteps(['Kenneth Larsen'], 'accessing the property triggers a re-computation');
    }

    '@test it has a separate cache per class instance'() {
      let assert = this.assert;

      class Person {
        @tracked firstName;
        @tracked lastName;

        constructor(firstName, lastName) {
          this.firstName = firstName;
          this.lastName = lastName;
        }

        @cached
        get fullName() {
          let fullName = `${this.firstName} ${this.lastName}`;
          assert.step(fullName);
          return fullName;
        }
      }

      let jen = new Person('Jen', 'Weber');
      let chris = new Person('Chris', 'Garrett');

      assert.verifySteps([], 'getter is not called after class initialization');

      assert.strictEqual(jen.fullName, 'Jen Weber');
      assert.verifySteps(['Jen Weber'], 'getter was called after property access');

      assert.strictEqual(jen.fullName, 'Jen Weber');
      assert.verifySteps([], 'getter was not called again after repeated property access');

      assert.strictEqual(chris.fullName, 'Chris Garrett', 'other instance has a different value');
      assert.verifySteps(['Chris Garrett'], 'getter was called after property access');

      assert.strictEqual(chris.fullName, 'Chris Garrett');
      assert.verifySteps([], 'getter was not called again after repeated property access');

      chris.lastName = 'Manson';
      assert.verifySteps([], 'changing a property does not trigger an eager re-computation');

      assert.strictEqual(jen.fullName, 'Jen Weber', 'other instance is unaffected');
      assert.verifySteps([], 'getter was not called again after repeated property access');

      assert.strictEqual(chris.fullName, 'Chris Manson');
      assert.verifySteps(['Chris Manson'], 'getter was called after property access');

      assert.strictEqual(jen.fullName, 'Jen Weber', 'other instance is unaffected');
      assert.verifySteps([], 'getter was not called again after repeated property access');
    }
  }
);
