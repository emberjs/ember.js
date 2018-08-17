import { computed, defineProperty, get, set, tagForProperty, tracked } from '../..';

import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { AbstractTestCase, moduleFor } from 'internal-test-helpers';

if (EMBER_METAL_TRACKED_PROPERTIES) {
  moduleFor(
    '@tracked get validation',
    class extends AbstractTestCase {
      [`@test validators for tracked getters with dependencies should invalidate when the dependencies invalidate`](
        assert: Assert
      ) {
        class Tracked {
          @tracked first?: string = undefined;
          @tracked last?: string = undefined;
          constructor(first: string, last: string) {
            this.first = first;
            this.last = last;
          }

          @tracked
          get full() {
            return `${this.first} ${this.last}`;
          }
        }

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
        assert: Assert
      ) {
        interface NameInterface {
          first: string;
          last: string;
        }
        class Tracked {
          @tracked name: NameInterface;
          constructor(name: NameInterface) {
            this.name = name;
          }

          @tracked
          get full() {
            return `${get(this.name, 'first')} ${get(this.name, 'last')}`;
          }
        }

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
        assert.equal(tag.validate(snapshot), false, 'invalid after setting with Ember set');

        assert.equal(obj.full, 'Thomas Dale');
        snapshot = tag.value();

        assert.equal(tag.validate(snapshot), true);
      }

      [`@test interaction with Ember object model (Ember computed property depending on tracked property)`](
        assert: Assert
      ) {
        class EmberObject {
          name: Name;
          constructor(name: Name) {
            this.name = name;
          }
        }

        defineProperty(
          EmberObject.prototype,
          'full',
          computed('name', function(this: EmberObject) {
            let name = get(this, 'name');
            return `${name.first} ${name.last}`;
          })
        );

        class Name {
          @tracked first: string;
          @tracked last: string;
          constructor(first: string, last: string) {
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
        assert: Assert
      ) {
        let self: EmberObject;
        class EmberObject {
          contact: Contact;
          constructor(contact: Contact) {
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
          @tracked name?: EmberName = undefined;
          constructor(name: EmberName) {
            this.name = name;
          }
        }

        class EmberName {
          first: string;
          last: string;
          constructor(first: string, last: string) {
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
