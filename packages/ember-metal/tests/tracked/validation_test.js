import { computed, defineProperty, get, set, tracked } from '../..';

import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { tagForProperty } from '../..';

import { EMBER_METAL_TRACKED_PROPERTIES } from 'ember/features';

if (EMBER_METAL_TRACKED_PROPERTIES) {
  moduleFor(
    'tracked get validation',
    class extends AbstractTestCase {
      [`@test validators for tracked getters with dependencies should invalidate when the dependencies invalidate`](
        assert
      ) {
        class Tracked {
          constructor(first, last) {
            this.first = first;
            this.last = last;
          }
        }

        track(Tracked, ['first', 'last'], {
          get full() {
            return `${this.first} ${this.last}`;
          }
        });

        let obj = new Tracked('Tom', 'Dale');

        let tag = tagForProperty(obj, 'full');
        let snapshot = tag.value();

        let full = obj.full;
        assert.equal(full, 'Tom Dale', 'The full name starts correct');
        assert.equal(tag.validate(snapshot), true);

        snapshot = tag.value();
        assert.equal(tag.validate(snapshot), true);

        obj.first = 'Thomas';
        assert.equal(tag.validate(snapshot), false);

        assert.equal(obj.full, 'Thomas Dale');
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
        }

        track(Tracked, ['name'], {
          get full() {
            return `${get(this.name, 'first')} ${get(this.name, 'last')}`;
          }
        });

        let tom = { first: 'Tom', last: 'Dale' };

        let obj = new Tracked(tom);

        let tag = tagForProperty(obj, 'full');
        let snapshot = tag.value();

        let full = obj.full;
        assert.equal(full, 'Tom Dale');
        assert.equal(tag.validate(snapshot), true);

        snapshot = tag.value();
        assert.equal(tag.validate(snapshot), true);

        set(tom, 'first', 'Thomas');
        assert.equal(
          tag.validate(snapshot),
          false,
          'invalid after setting with Ember set'
        );

        assert.equal(obj.full, 'Thomas Dale');
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
          constructor(first, last) {
            this.first = first;
            this.last = last;
          }
        }

        track(Name, ['first', 'last']);

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

        // assert.equal(tag.validate(snapshot), true);
      }

      ['@test interaction with the Ember object model (paths going through tracked properties)'](
        assert
      ) {
        class EmberObject {
          constructor(contact) {
            this.contact = contact;
          }
        }

        defineProperty(
          EmberObject.prototype,
          'full',
          computed('contact.name.first', 'contact.name.last', function() {
            let contact = get(this, 'contact');
            return `${get(contact.name, 'first')} ${get(contact.name, 'last')}`;
          })
        );

        class Contact {
          constructor(name) {
            this.name = name;
          }
        }

        track(Contact, ['name']);

        class EmberName {
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
        assert.equal(
          tag.validate(snapshot),
          false,
          'invalid after setting with Ember.set'
        );

        assert.equal(get(obj, 'full'), 'Thomas Dale');
        snapshot = tag.value();

        tom = contact.name = new EmberName('T', 'Dale');
        assert.equal(
          tag.validate(snapshot),
          false,
          'invalid after setting with Ember.set'
        );

        assert.equal(get(obj, 'full'), 'T Dale');
        snapshot = tag.value();

        set(tom, 'first', 'Tizzle');
        assert.equal(
          tag.validate(snapshot),
          false,
          'invalid after setting with Ember.set'
        );

        assert.equal(get(obj, 'full'), 'Tizzle Dale');
      }
    }
  );
}

function track(Class, properties, accessors = {}) {
  let proto = Class.prototype;

  properties.forEach(prop => defineData(proto, prop));

  let keys = Object.getOwnPropertyNames(accessors);

  keys.forEach(key =>
    defineAccessor(proto, key, Object.getOwnPropertyDescriptor(accessors, key))
  );
}

function defineData(prototype, property) {
  Object.defineProperty(
    prototype,
    property,
    tracked(prototype, property, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: undefined
    })
  );
}

function defineAccessor(prototype, property, descriptor) {
  Object.defineProperty(
    prototype,
    property,
    tracked(prototype, property, descriptor)
  );
}
