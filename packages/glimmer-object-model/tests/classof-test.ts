import GlimmerObject, { classof } from 'glimmer-object-model';

QUnit.module('[glimmer-object-model] classof');

QUnit.test('basic usage', assert => {
  let Person = GlimmerObject.extend({
    named: 'Dan'
  });

  interface PersonInstance {
    named: string;
  }

  let PersonClass = classof<PersonInstance>(Person);

  class FancyPerson extends PersonClass {
    salutation: string;

    fullName() {
      return `${this.salutation} ${this.named}`;
    }
  }

  let person = FancyPerson.create({ named: 'Dan', salutation: 'Mr.' });

  assert.equal(person.fullName(), 'Mr. Dan');
});