import { computed, get, set } from '@ember/object';
import { addObserver, removeObserver } from '@ember/object/observers';
import { trackedArray, trackedMap, trackedObject, trackedSet } from '@ember/reactive/collections';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';

moduleFor(
  '@ember/reactive/collections | @computed | trackedObject',
  class extends AbstractTestCase {
    '@test a change to a key invalidates a computed with that dependent key'(assert) {
      class Person {
        contact = trackedObject({ name: 'Dan' });

        @computed('contact.name')
        get name() {
          return this.contact.name;
        }
      }

      let person = new Person();

      assert.strictEqual(person.name, 'Dan');

      person.contact.name = 'Daniel';

      assert.strictEqual(person.name, 'Daniel');
    }

    '@test a new key invalidates a computed with that dependent key'(assert) {
      class Person {
        contact = trackedObject({});

        @computed('contact.name')
        get name() {
          return this.contact.name;
        }
      }

      let person = new Person();

      assert.strictEqual(person.name, undefined);

      person.contact.name = 'Dan';

      assert.strictEqual(person.name, 'Dan');
    }

    '@test a deleted key invalidates a computed with that dependent key'(assert) {
      class Person {
        contact = trackedObject({ name: 'Dan' });

        @computed('contact.name')
        get name() {
          return this.contact.name;
        }
      }

      let person = new Person();

      assert.strictEqual(person.name, 'Dan');

      delete person.contact.name;

      assert.strictEqual(person.name, undefined);
    }

    '@test a change to another key does not invalidate the computed'(assert) {
      class Person {
        contact = trackedObject({ name: 'Dan', age: 30 });

        @computed('contact.name')
        get name() {
          assert.step('compute');

          return this.contact.name;
        }
      }

      let person = new Person();

      assert.strictEqual(person.name, 'Dan');

      person.contact.age = 31;

      assert.strictEqual(person.name, 'Dan');
      assert.verifySteps(['compute']);
    }

    '@test set() on a key invalidates the computed and updates the object'(assert) {
      class Person {
        contact = trackedObject({ name: 'Dan' });

        @computed('contact.name')
        get name() {
          return this.contact.name;
        }
      }

      let person = new Person();

      assert.strictEqual(person.name, 'Dan');

      set(person, 'contact.name', 'Daniel');

      assert.strictEqual(person.name, 'Daniel');
      assert.strictEqual(person.contact.name, 'Daniel');
      assert.strictEqual(get(person, 'contact.name'), 'Daniel');
    }

    '@test a nested trackedObject works in a longer dependent key'(assert) {
      class Person {
        data = trackedObject({ contact: trackedObject({ name: 'Dan' }) });

        @computed('data.contact.name')
        get name() {
          return this.data.contact.name;
        }
      }

      let person = new Person();

      assert.strictEqual(person.name, 'Dan');

      person.data.contact.name = 'Daniel';

      assert.strictEqual(person.name, 'Daniel');

      person.data.contact = trackedObject({ name: 'Danielle' });

      assert.strictEqual(person.name, 'Danielle');

      person.data.contact.name = 'Dani';

      assert.strictEqual(person.name, 'Dani');
    }

    async '@test a change to a key fires an observer on that key'(assert) {
      let person = { contact: trackedObject({ name: 'Dan' }) };

      let observer = () => assert.step(`observed ${person.contact.name}`);

      addObserver(person, 'contact.name', observer);

      person.contact.name = 'Daniel';
      await runLoopSettled();

      assert.verifySteps(['observed Daniel']);

      removeObserver(person, 'contact.name', observer);
    }
  }
);

moduleFor(
  '@ember/reactive/collections | @computed | trackedArray',
  class extends AbstractTestCase {
    '@test push() invalidates a computed with a `[]` dependent key'(assert) {
      class List {
        items = trackedArray([1, 2]);

        @computed('items.[]')
        get total() {
          return this.items.reduce((sum, item) => sum + item, 0);
        }
      }

      let list = new List();

      assert.strictEqual(list.total, 3);

      list.items.push(3);

      assert.strictEqual(list.total, 6);
    }

    '@test an index write invalidates a computed with a `[]` dependent key'(assert) {
      class List {
        items = trackedArray([1, 2]);

        @computed('items.[]')
        get total() {
          return this.items.reduce((sum, item) => sum + item, 0);
        }
      }

      let list = new List();

      assert.strictEqual(list.total, 3);

      list.items[0] = 10;

      assert.strictEqual(list.total, 12);
    }

    '@test methods that change the array in place invalidate a `[]` dependent key'(assert) {
      class List {
        items = trackedArray([3, 1, 2]);

        @computed('items.[]')
        get joined() {
          return this.items.join(',');
        }
      }

      let list = new List();

      assert.strictEqual(list.joined, '3,1,2');

      list.items.sort();
      assert.strictEqual(list.joined, '1,2,3');

      list.items.reverse();
      assert.strictEqual(list.joined, '3,2,1');

      list.items.splice(1, 1);
      assert.strictEqual(list.joined, '3,1');

      list.items.pop();
      assert.strictEqual(list.joined, '3');

      list.items.unshift(4);
      assert.strictEqual(list.joined, '4,3');

      list.items.shift();
      assert.strictEqual(list.joined, '3');

      list.items.length = 0;
      assert.strictEqual(list.joined, '');
    }

    '@test a length change invalidates a computed with a `length` dependent key'(assert) {
      class List {
        items = trackedArray([1, 2]);

        @computed('items.length')
        get count() {
          return this.items.length;
        }
      }

      let list = new List();

      assert.strictEqual(list.count, 2);

      list.items.push(3);
      assert.strictEqual(list.count, 3);

      list.items.pop();
      assert.strictEqual(list.count, 2);

      list.items.length = 0;
      assert.strictEqual(list.count, 0);
    }

    '@test `@each` sees new items and changes to trackedObject items'(assert) {
      class List {
        items = trackedArray([trackedObject({ name: 'a' }), trackedObject({ name: 'b' })]);

        @computed('items.@each.name')
        get names() {
          return this.items.map((item) => item.name).join(',');
        }
      }

      let list = new List();

      assert.strictEqual(list.names, 'a,b');

      list.items[0].name = 'z';
      assert.strictEqual(list.names, 'z,b');

      list.items.push(trackedObject({ name: 'c' }));
      assert.strictEqual(list.names, 'z,b,c');

      list.items[2].name = 'y';
      assert.strictEqual(list.names, 'z,b,y');
    }

    '@test a trackedArray as a trackedObject value works in a dependent key'(assert) {
      class List {
        data = trackedObject({ items: trackedArray([1]) });

        @computed('data.items.[]')
        get joined() {
          return this.data.items.join(',');
        }
      }

      let list = new List();

      assert.strictEqual(list.joined, '1');

      list.data.items.push(2);
      assert.strictEqual(list.joined, '1,2');

      list.data.items = trackedArray([9]);
      assert.strictEqual(list.joined, '9');
    }

    async '@test a change fires an observer on `[]`'(assert) {
      let list = { items: trackedArray([1]) };

      let observer = () => assert.step(`observed ${list.items.join(',')}`);

      addObserver(list, 'items.[]', observer);

      list.items.push(2);
      await runLoopSettled();

      assert.verifySteps(['observed 1,2']);

      removeObserver(list, 'items.[]', observer);
    }
  }
);

moduleFor(
  '@ember/reactive/collections | @computed | trackedMap',
  class extends AbstractTestCase {
    '@test changes invalidate a computed with a `size` dependent key'(assert) {
      class Registry {
        map = trackedMap([['a', 1]]);

        @computed('map.size')
        get entries() {
          let result = [];

          this.map.forEach((value, key) => result.push(`${key}=${value}`));

          return result.join(',');
        }
      }

      let registry = new Registry();

      assert.strictEqual(registry.entries, 'a=1');

      registry.map.set('b', 2);
      assert.strictEqual(registry.entries, 'a=1,b=2');

      registry.map.set('a', 10);
      assert.strictEqual(registry.entries, 'a=10,b=2');

      registry.map.delete('a');
      assert.strictEqual(registry.entries, 'b=2');

      registry.map.clear();
      assert.strictEqual(registry.entries, '');
    }

    '@test `size` covers each read method of the map'(assert) {
      class Registry {
        map = trackedMap([['a', 1]]);

        @computed('map.size')
        get a() {
          return this.map.get('a');
        }

        @computed('map.size')
        get hasB() {
          return this.map.has('b');
        }

        @computed('map.size')
        get count() {
          return this.map.size;
        }

        @computed('map.size')
        get keys() {
          return Array.from(this.map.keys()).join(',');
        }

        @computed('map.size')
        get values() {
          return Array.from(this.map.values()).join(',');
        }

        @computed('map.size')
        get pairs() {
          let result = [];

          for (let [key, value] of this.map) {
            result.push(`${key}=${value}`);
          }

          return result.join(',');
        }
      }

      let registry = new Registry();

      assert.strictEqual(registry.a, 1);
      assert.false(registry.hasB);
      assert.strictEqual(registry.count, 1);
      assert.strictEqual(registry.keys, 'a');
      assert.strictEqual(registry.values, '1');
      assert.strictEqual(registry.pairs, 'a=1');

      registry.map.set('a', 10);
      registry.map.set('b', 2);

      assert.strictEqual(registry.a, 10);
      assert.true(registry.hasB);
      assert.strictEqual(registry.count, 2);
      assert.strictEqual(registry.keys, 'a,b');
      assert.strictEqual(registry.values, '10,2');
      assert.strictEqual(registry.pairs, 'a=10,b=2');

      registry.map.delete('a');

      assert.strictEqual(registry.a, undefined);
      assert.strictEqual(registry.count, 1);
      assert.strictEqual(registry.keys, 'b');
    }

    '@test a set() of the same value does not invalidate the computed'(assert) {
      class Registry {
        map = trackedMap([['a', 1]]);

        @computed('map.size')
        get a() {
          assert.step('compute');

          return this.map.get('a');
        }
      }

      let registry = new Registry();

      assert.strictEqual(registry.a, 1);

      registry.map.set('a', 1);

      assert.strictEqual(registry.a, 1);
      assert.verifySteps(['compute']);
    }

    async '@test a change fires an observer on `size`'(assert) {
      let registry = { map: trackedMap() };
      let observer = () => assert.step(`observed ${registry.map.get('a')}`);

      addObserver(registry, 'map.size', observer);

      registry.map.set('a', 1);
      await runLoopSettled();

      assert.verifySteps(['observed 1']);

      removeObserver(registry, 'map.size', observer);
    }
  }
);

moduleFor(
  '@ember/reactive/collections | @computed | trackedSet',
  class extends AbstractTestCase {
    '@test changes invalidate a computed with a `size` dependent key'(assert) {
      class Registry {
        set = trackedSet(['a']);

        @computed('set.size')
        get values() {
          let result = [];

          this.set.forEach((value) => result.push(value));

          return result.join(',');
        }
      }

      let registry = new Registry();

      assert.strictEqual(registry.values, 'a');

      registry.set.add('b');
      assert.strictEqual(registry.values, 'a,b');

      registry.set.delete('a');
      assert.strictEqual(registry.values, 'b');

      registry.set.clear();
      assert.strictEqual(registry.values, '');
    }

    '@test `size` covers each read method of the set'(assert) {
      class Registry {
        set = trackedSet(['a']);

        @computed('set.size')
        get hasB() {
          return this.set.has('b');
        }

        @computed('set.size')
        get count() {
          return this.set.size;
        }

        @computed('set.size')
        get list() {
          return Array.from(this.set.values()).join(',');
        }

        @computed('set.size')
        get iterated() {
          let result = [];

          for (let value of this.set) {
            result.push(value);
          }

          return result.join(',');
        }
      }

      let registry = new Registry();

      assert.false(registry.hasB);
      assert.strictEqual(registry.count, 1);
      assert.strictEqual(registry.list, 'a');
      assert.strictEqual(registry.iterated, 'a');

      registry.set.add('b');

      assert.true(registry.hasB);
      assert.strictEqual(registry.count, 2);
      assert.strictEqual(registry.list, 'a,b');
      assert.strictEqual(registry.iterated, 'a,b');

      registry.set.delete('b');

      assert.false(registry.hasB);
      assert.strictEqual(registry.count, 1);
    }

    '@test an add() of a value in the set does not invalidate the computed'(assert) {
      class Registry {
        set = trackedSet(['a']);

        @computed('set.size')
        get count() {
          assert.step('compute');

          return this.set.size;
        }
      }

      let registry = new Registry();

      assert.strictEqual(registry.count, 1);

      registry.set.add('a');

      assert.strictEqual(registry.count, 1);
      assert.verifySteps(['compute']);
    }

    async '@test a change fires an observer on `size`'(assert) {
      let registry = { set: trackedSet() };
      let observer = () => assert.step(`observed ${registry.set.has('a')}`);

      addObserver(registry, 'set.size', observer);

      registry.set.add('a');
      await runLoopSettled();

      assert.verifySteps(['observed true']);

      removeObserver(registry, 'set.size', observer);
    }
  }
);
