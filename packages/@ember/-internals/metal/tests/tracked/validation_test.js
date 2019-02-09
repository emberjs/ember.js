import { computed, defineProperty, get, set, tagForProperty, tracked } from '../..';

import {
  EMBER_METAL_TRACKED_PROPERTIES,
  EMBER_NATIVE_DECORATOR_SUPPORT,
} from '@ember/canary-features';
import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { track } from './support';

if (EMBER_METAL_TRACKED_PROPERTIES && EMBER_NATIVE_DECORATOR_SUPPORT) {
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
        let snapshot = tag.value();

        assert.equal(obj.first, 'Tom', 'The full name starts correct');
        assert.equal(tag.validate(snapshot), true);

        snapshot = tag.value();
        assert.equal(tag.validate(snapshot), true);

        obj.first = 'Thomas';

        assert.equal(tag.validate(snapshot), false);

        assert.equal(obj.first, 'Thomas');
        snapshot = tag.value();

        assert.equal(tag.validate(snapshot), true);
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
        let snapshot = tag.value();

        assert.equal(obj.full, 'Tom Dale', 'The full name starts correct');
        assert.equal(tag.validate(snapshot), true);

        snapshot = tag.value();
        assert.equal(tag.validate(snapshot), true);

        obj.first = 'Thomas';

        assert.equal(tag.validate(snapshot), false);

        assert.equal(obj.full, 'Thomas Dale');
        snapshot = tag.value();

        assert.equal(tag.validate(snapshot), true);
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
        let snapshot = tag.value();

        assert.equal(obj.full, 'Tom Dale', 'The full name starts correct');
        assert.equal(tag.validate(snapshot), true);

        snapshot = tag.value();
        assert.equal(tag.validate(snapshot), true);

        obj.full = 'Melanie Sumner';

        assert.equal(tag.validate(snapshot), false);

        assert.equal(obj.full, 'Melanie Sumner');
        assert.equal(obj.first, 'Melanie');
        assert.equal(obj.last, 'Sumner');
        snapshot = tag.value();

        assert.equal(tag.validate(snapshot), true);
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
        let snapshot = tag.value();

        assert.equal(obj.full, 'Tom Dale');
        assert.equal(tag.validate(snapshot), true);

        snapshot = tag.value();
        assert.equal(tag.validate(snapshot), true);

        set(tom, 'first', 'Thomas');
        assert.equal(tag.validate(snapshot), false, 'invalid after setting with Ember set');

        assert.equal(obj.full, 'Thomas Dale');
        snapshot = tag.value();

        assert.equal(tag.validate(snapshot), true);

        set(obj, 'name', { first: 'Ricardo', last: 'Mendes' });

        assert.equal(tag.validate(snapshot), false, 'invalid after setting with Ember set');

        assert.equal(obj.full, 'Ricardo Mendes');
        snapshot = tag.value();

        assert.equal(tag.validate(snapshot), true);
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
          computed('name', function() {
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
        let snapshot = tag.value();

        let full = get(obj, 'full');
        assert.equal(full, 'Tom Dale');
        assert.equal(tag.validate(snapshot), true);

        snapshot = tag.value();
        assert.equal(tag.validate(snapshot), true);

        tom.first = 'Thomas';
        assert.equal(
          tag.validate(snapshot),
          false,
          'invalid after setting with tracked properties'
        );

        assert.equal(get(obj, 'full'), 'Thomas Dale');
        snapshot = tag.value();

        assert.equal(tag.validate(snapshot), true);
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
        let snapshot = tag.value();

        let full = get(obj, 'full');
        assert.equal(full, 'Tom Dale');
        assert.equal(tag.validate(snapshot), true);

        snapshot = tag.value();
        assert.equal(tag.validate(snapshot), true);

        set(tom, 'first', 'Thomas');
        assert.equal(tag.validate(snapshot), false, 'invalid after setting with Ember.set');

        assert.equal(get(obj, 'full'), 'Thomas Dale');
        snapshot = tag.value();

        tom = contact.name = new EmberName('T', 'Dale');
        assert.equal(tag.validate(snapshot), false, 'invalid after setting with Ember.set');

        assert.equal(get(obj, 'full'), 'T Dale');
        snapshot = tag.value();

        set(tom, 'first', 'Tizzle');
        assert.equal(tag.validate(snapshot), false, 'invalid after setting with Ember.set');

        assert.equal(get(obj, 'full'), 'Tizzle Dale');
      }
    }
  );
}
