import GlimmerObject, { computed } from 'glimmer-object-model';
QUnit.module('[glimmer-object-model] - computed properties');

QUnit.test('basic computed properties', assert => {
  let Person = GlimmerObject.extend({
    first: 'Dan',
    last: 'Gebhardt',

    full: computed('first', 'last', {
      get() {
        return `${this.first} ${this.last}`;
      },
      set(value: string) {
        let [first, last] = value.split(' ');
        this.first = first;
        this.last = last;
      }
    })
  });

  let obj = Person.create();

  assert.equal(obj.full, 'Dan Gebhardt');
});