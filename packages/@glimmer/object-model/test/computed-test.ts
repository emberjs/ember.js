import GlimmerObject, { computed, root, set } from '../index';
QUnit.module('[glimmer-object-model] - computed properties');

QUnit.test('basic computed properties', assert => {
  let Person = GlimmerObject.extend({
    first: 'Dan',
    last: 'Gebhardt',

    full: computed('first', 'last', {
      get(this: any) {
        return `${this.first} ${this.last}`;
      },
      set(this: any, value: string) {
        let [first, last] = value.split(' ');
        this.first = first;
        this.last = last;
      }
    })
  });

  let FancyPerson = Person.extend({
    sal: 'Mr.'
  });

  let obj = FancyPerson.create();

  assert.equal(obj.full, 'Dan Gebhardt');
  assert.equal(obj.sal, 'Mr.');
});

QUnit.test('references for computed properties', assert => {
  let Person = GlimmerObject.extend({
    first: 'Dan',
    last: 'Gebhardt',

    full: computed('first', 'last', {
      get(this: any) {
        return `${this.first} ${this.last}`;
      },
      set(this: any, value: string) {
        let [first, last] = value.split(' ');
        this.first = first;
        this.last = last;
      }
    })
  });

  let obj = Person.create();
  let ref = root(obj).get('full');

  ref.value();
  let snapshot = ref.tag.value();

  assert.strictEqual(obj.full, 'Dan Gebhardt');

  set(obj, 'first', 'Daniel');

  assert.strictEqual(obj.full, 'Daniel Gebhardt');
  assert.strictEqual(ref.tag.validate(snapshot), false);
  assert.strictEqual(ref.value(), 'Daniel Gebhardt');
});

QUnit.test('references for multiple subclasses of computed properties', assert => {
  let Person = GlimmerObject.extend({
    first: 'Dan',
    last: 'Gebhardt',

    full: computed('first', 'last', {
      get(this: any) {
        return `${this.first} ${this.last}`;
      },
      set(this: any, value: string) {
        let [first, last] = value.split(' ');
        this.first = first;
        this.last = last;
      }
    })
  });

  let FancyPerson = Person.extend({
    sal: 'Mr.',

    name: computed('sal', 'full', {
      get(this: any) {
        return `${this.sal} ${this.full}`;
      },
      set(this: any, value: string) {
        let [, sal, full] = value.match(/([^ ]+) (.*)/)!;
        this.sal = sal;
        this.full = full;
      }
    })
  });

  let obj = FancyPerson.create();
  let ref = root(obj).get('name');

  ref.value();
  let snapshot = ref.tag.value();

  assert.strictEqual(obj.full, 'Dan Gebhardt');
  assert.strictEqual(obj.name, 'Mr. Dan Gebhardt');

  set(obj, 'first', 'Daniel');

  assert.strictEqual(obj.full, 'Daniel Gebhardt');
  assert.strictEqual(obj.name, 'Mr. Daniel Gebhardt');
  assert.strictEqual(ref.tag.validate(snapshot), false);
  assert.strictEqual(ref.value(), 'Mr. Daniel Gebhardt');
});
