import {
  computed,
  defineProperty,
  get,
  set,
  tagForProperty,
  tracked,
  notifyPropertyChange,
} from '../..';

import { EMBER_ARRAY } from '@ember/-internals/utils';
import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { track, value, validate } from '@glimmer/validator';

moduleFor(
  '@tracked get validation',
  class extends AbstractTestCase {
    [`@test autotracking should work with tracked fields`](assert) {
      class Tracked {
        @tracked first = undefined;
        constructor(first) {
          this.first = first;
        }
      }

      let obj = new Tracked('Tom', 'Dale');

      let tag = track(() => obj.first);
      let snapshot = value(tag);

      assert.equal(obj.first, 'Tom', 'The full name starts correct');
      assert.equal(validate(tag, snapshot), true);

      snapshot = value(tag);
      assert.equal(validate(tag, snapshot), true);

      obj.first = 'Thomas';

      assert.equal(validate(tag, snapshot), false);

      assert.equal(obj.first, 'Thomas');
      snapshot = value(tag);

      assert.equal(validate(tag, snapshot), true);
    }

    [`@test autotracking should work with native getters`](assert) {
      class Tracked {
        @tracked first = undefined;
        @tracked last = undefined;
        constructor(first, last) {
          this.first = first;
          this.last = last;
        }

        get full() {
          return `${this.first} ${this.last}`;
        }
      }

      let obj = new Tracked('Tom', 'Dale');

      let tag = track(() => obj.full);
      let snapshot = value(tag);

      assert.equal(obj.full, 'Tom Dale', 'The full name starts correct');
      assert.equal(validate(tag, snapshot), true);

      snapshot = value(tag);
      assert.equal(validate(tag, snapshot), true);

      obj.first = 'Thomas';

      assert.equal(validate(tag, snapshot), false);

      assert.equal(obj.full, 'Thomas Dale');
      snapshot = value(tag);

      assert.equal(validate(tag, snapshot), true);
    }

    [`@test autotracking should work with native setters`](assert) {
      class Tracked {
        @tracked first = undefined;
        @tracked last = undefined;
        constructor(first, last) {
          this.first = first;
          this.last = last;
        }

        get full() {
          return `${this.first} ${this.last}`;
        }

        set full(value) {
          let [first, last] = value.split(' ');

          this.first = first;
          this.last = last;
        }
      }

      let obj = new Tracked('Tom', 'Dale');

      let tag = track(() => obj.full);
      let snapshot = value(tag);

      assert.equal(obj.full, 'Tom Dale', 'The full name starts correct');
      assert.equal(validate(tag, snapshot), true);

      snapshot = value(tag);
      assert.equal(validate(tag, snapshot), true);

      obj.full = 'Melanie Sumner';

      assert.equal(validate(tag, snapshot), false);

      assert.equal(obj.full, 'Melanie Sumner');
      assert.equal(obj.first, 'Melanie');
      assert.equal(obj.last, 'Sumner');
      snapshot = value(tag);

      assert.equal(validate(tag, snapshot), true);
    }

    [`@test interaction with Ember object model (tracked property depending on Ember property)`](
      assert
    ) {
      class Tracked {
        constructor(name) {
          this.name = name;
        }

        get full() {
          return `${get(this, 'name.first')} ${get(this, 'name.last')}`;
        }
      }

      let tom = { first: 'Tom', last: 'Dale' };

      let obj = new Tracked(tom);

      let tag = track(() => obj.full);
      let snapshot = value(tag);

      assert.equal(obj.full, 'Tom Dale');
      assert.equal(validate(tag, snapshot), true);

      snapshot = value(tag);
      assert.equal(validate(tag, snapshot), true);

      set(tom, 'first', 'Thomas');
      assert.equal(validate(tag, snapshot), false, 'invalid after setting with Ember set');

      assert.equal(obj.full, 'Thomas Dale');
      snapshot = value(tag);

      assert.equal(validate(tag, snapshot), true);

      set(obj, 'name', { first: 'Ricardo', last: 'Mendes' });

      assert.equal(validate(tag, snapshot), false, 'invalid after setting with Ember set');

      assert.equal(obj.full, 'Ricardo Mendes');
      snapshot = value(tag);

      assert.equal(validate(tag, snapshot), true);
    }

    [`@test interaction with Ember object model (Ember computed property depending on tracked property)`](
      assert
    ) {
      class EmberObject {
        constructor(name) {
          this.name = name;
        }
      }

      defineProperty(
        EmberObject.prototype,
        'full',
        computed('name.first', 'name.last', function() {
          let name = get(this, 'name');
          return `${name.first} ${name.last}`;
        })
      );

      class Name {
        @tracked first;
        @tracked last;

        constructor(first, last) {
          this.first = first;
          this.last = last;
        }
      }

      let tom = new Name('Tom', 'Dale');
      let obj = new EmberObject(tom);

      let tag = tagForProperty(obj, 'full');
      let snapshot = value(tag);

      let full = get(obj, 'full');
      assert.equal(full, 'Tom Dale');
      assert.equal(validate(tag, snapshot), true);

      snapshot = value(tag);
      assert.equal(validate(tag, snapshot), true);

      tom.first = 'Thomas';
      assert.equal(validate(tag, snapshot), false, 'invalid after setting with tracked properties');

      assert.equal(get(obj, 'full'), 'Thomas Dale');
      snapshot = value(tag);

      assert.equal(validate(tag, snapshot), true);
    }

    ['@test interaction with the Ember object model (paths going through tracked properties)'](
      assert
    ) {
      let self;
      class EmberObject {
        contact;
        constructor(contact) {
          this.contact = contact;
          self = this;
        }
      }

      defineProperty(
        EmberObject.prototype,
        'full',
        computed('contact.name.first', 'contact.name.last', function() {
          let contact = get(self, 'contact');
          return `${get(contact.name, 'first')} ${get(contact.name, 'last')}`;
        })
      );

      class Contact {
        @tracked name = undefined;
        constructor(name) {
          this.name = name;
        }
      }

      class EmberName {
        first;
        last;
        constructor(first, last) {
          this.first = first;
          this.last = last;
        }
      }

      let tom = new EmberName('Tom', 'Dale');
      let contact = new Contact(tom);
      let obj = new EmberObject(contact);

      let tag = tagForProperty(obj, 'full');
      let snapshot = value(tag);

      let full = get(obj, 'full');
      assert.equal(full, 'Tom Dale');
      assert.equal(validate(tag, snapshot), true);

      snapshot = value(tag);
      assert.equal(validate(tag, snapshot), true);

      set(tom, 'first', 'Thomas');
      assert.equal(validate(tag, snapshot), false, 'invalid after setting with Ember.set');

      assert.equal(get(obj, 'full'), 'Thomas Dale');
      snapshot = value(tag);

      tom = contact.name = new EmberName('T', 'Dale');
      assert.equal(validate(tag, snapshot), false, 'invalid after setting with Ember.set');

      assert.equal(get(obj, 'full'), 'T Dale');
      snapshot = value(tag);

      set(tom, 'first', 'Tizzle');
      assert.equal(validate(tag, snapshot), false, 'invalid after setting with Ember.set');

      assert.equal(get(obj, 'full'), 'Tizzle Dale');
    }

    ['@test interaction with arrays'](assert) {
      class EmberObject {
        @tracked array = [];
      }

      let obj = new EmberObject();

      let tag = tagForProperty(obj, 'array');
      let snapshot = value(tag);

      let array = get(obj, 'array');
      assert.deepEqual(array, []);
      assert.equal(validate(tag, snapshot), true);

      array.push(1);
      notifyPropertyChange(array, '[]');
      assert.equal(
        validate(tag, snapshot),
        false,
        'invalid after pushing an object and notifying on the array'
      );
    }

    ['@test interaction with ember arrays'](assert) {
      class EmberObject {
        @tracked emberArray = {
          [EMBER_ARRAY]: true,
        };
      }

      let obj = new EmberObject();

      let tag = tagForProperty(obj, 'emberArray');
      let snapshot = value(tag);

      let emberArray = get(obj, 'emberArray');
      assert.equal(validate(tag, snapshot), true);

      notifyPropertyChange(emberArray, '[]');
      assert.equal(
        validate(tag, snapshot),
        false,
        'invalid after setting a property on the object'
      );
    }

    ['@test gives helpful assertion when a tracked property is mutated after access in with an autotracking transaction']() {
      class EmberObject {
        @tracked value;
      }

      let obj = new EmberObject();

      expectAssertion(() => {
        track(() => {
          obj.value;
          obj.value = 123;
        });
      }, /You attempted to update `value` on `EmberObject`, but it had already been used previously in the same computation/);
    }

    ['@test gives helpful assertion when a tracked property is mutated after access within unknownProperty within an autotracking transaction']() {
      class EmberObject {
        @tracked foo;

        unknownProperty() {
          this.foo;
          this.foo = 123;
        }
      }

      let obj = new EmberObject();

      expectAssertion(() => {
        track(() => {
          get(obj, 'bar');
        });
      }, /You attempted to update `foo` on `EmberObject`, but it had already been used previously in the same computation/);
    }
  }
);
