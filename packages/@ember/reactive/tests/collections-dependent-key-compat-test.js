import { computed } from '@ember/object';
import { dependentKeyCompat } from '@ember/object/compat';
import { addObserver, removeObserver } from '@ember/object/observers';
import {
  trackedArray,
  trackedMap,
  trackedObject,
  trackedSet,
  trackedWeakMap,
  trackedWeakSet,
} from '@ember/reactive/collections';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';

moduleFor(
  '@ember/reactive/collections | @dependentKeyCompat | trackedObject',
  class extends AbstractTestCase {
    '@test a getter that reads a key'(assert) {
      class Person {
        contact = trackedObject({ name: 'Dan' });

        @dependentKeyCompat
        get contactName() {
          return this.contact.name;
        }

        @computed('contactName')
        get greeting() {
          return `Hello ${this.contactName}`;
        }
      }

      let person = new Person();

      assert.strictEqual(person.greeting, 'Hello Dan');

      person.contact.name = 'Daniel';
      assert.strictEqual(person.greeting, 'Hello Daniel');

      delete person.contact.name;
      assert.strictEqual(person.greeting, 'Hello undefined');
    }

    '@test a getter that reads the keys'(assert) {
      class Person {
        contact = trackedObject({ name: 'Dan' });

        @dependentKeyCompat
        get fields() {
          return Object.keys(this.contact);
        }

        @computed('fields')
        get summary() {
          return this.fields.join(',');
        }
      }

      let person = new Person();

      assert.strictEqual(person.summary, 'name');

      person.contact.age = 30;
      assert.strictEqual(person.summary, 'name,age');

      delete person.contact.name;
      assert.strictEqual(person.summary, 'age');
    }

    '@test a getter that uses the `in` operator'(assert) {
      class Person {
        contact = trackedObject({});

        @dependentKeyCompat
        get hasName() {
          return 'name' in this.contact;
        }

        @computed('hasName')
        get summary() {
          return this.hasName ? 'named' : 'anonymous';
        }
      }

      let person = new Person();

      assert.strictEqual(person.summary, 'anonymous');

      person.contact.name = 'Dan';
      assert.strictEqual(person.summary, 'named');

      delete person.contact.name;
      assert.strictEqual(person.summary, 'anonymous');
    }

    async '@test a getter fires an observer'(assert) {
      class Person {
        contact = trackedObject({ name: 'Dan' });

        @dependentKeyCompat
        get contactName() {
          return this.contact.name;
        }
      }

      let person = new Person();
      let observer = () => assert.step(`observed ${person.contactName}`);

      addObserver(person, 'contactName', null, observer, false);

      // The first read connects the getter to the collection.
      assert.strictEqual(person.contactName, 'Dan');

      person.contact.name = 'Daniel';
      await runLoopSettled();

      assert.verifySteps(['observed Daniel']);

      removeObserver(person, 'contactName', null, observer, false);
    }
  }
);

moduleFor(
  '@ember/reactive/collections | @dependentKeyCompat | trackedArray',
  class extends AbstractTestCase {
    '@test a getter that reads an index'(assert) {
      class List {
        items = trackedArray(['a', 'b']);

        @dependentKeyCompat
        get first() {
          return this.items[0];
        }

        @computed('first')
        get summary() {
          return `first: ${this.first}`;
        }
      }

      let list = new List();

      assert.strictEqual(list.summary, 'first: a');

      list.items[0] = 'z';
      assert.strictEqual(list.summary, 'first: z');

      list.items.unshift('y');
      assert.strictEqual(list.summary, 'first: y');

      list.items.shift();
      assert.strictEqual(list.summary, 'first: z');
    }

    '@test a getter that reads the length'(assert) {
      class List {
        items = trackedArray(['a', 'b']);

        @dependentKeyCompat
        get count() {
          return this.items.length;
        }

        @computed('count')
        get summary() {
          return `count: ${this.count}`;
        }
      }

      let list = new List();

      assert.strictEqual(list.summary, 'count: 2');

      list.items.push('c');
      assert.strictEqual(list.summary, 'count: 3');

      list.items.pop();
      assert.strictEqual(list.summary, 'count: 2');

      list.items.length = 0;
      assert.strictEqual(list.summary, 'count: 0');
    }

    '@test a getter that uses the read methods'(assert) {
      class List {
        items = trackedArray([3, 1, 2]);

        @dependentKeyCompat
        get doubled() {
          return this.items.map((item) => item * 2);
        }

        @dependentKeyCompat
        get large() {
          return this.items.filter((item) => item > 1);
        }

        @dependentKeyCompat
        get hasTen() {
          return this.items.includes(10);
        }

        @computed('doubled', 'large', 'hasTen')
        get summary() {
          return `${this.doubled.join(',')} | ${this.large.join(',')} | ${this.hasTen}`;
        }
      }

      let list = new List();

      assert.strictEqual(list.summary, '6,2,4 | 3,2 | false');

      list.items.push(10);
      assert.strictEqual(list.summary, '6,2,4,20 | 3,2,10 | true');

      list.items.sort((a, b) => a - b);
      assert.strictEqual(list.summary, '2,4,6,20 | 2,3,10 | true');

      list.items.reverse();
      assert.strictEqual(list.summary, '20,6,4,2 | 10,3,2 | true');

      list.items.splice(0, 1);
      assert.strictEqual(list.summary, '6,4,2 | 3,2 | false');
    }

    '@test a getter that reads trackedObject items'(assert) {
      class List {
        items = trackedArray([trackedObject({ name: 'a' })]);

        @dependentKeyCompat
        get names() {
          return this.items.map((item) => item.name);
        }

        @computed('names')
        get summary() {
          return this.names.join(',');
        }
      }

      let list = new List();

      assert.strictEqual(list.summary, 'a');

      list.items[0].name = 'z';
      assert.strictEqual(list.summary, 'z');

      list.items.push(trackedObject({ name: 'b' }));
      assert.strictEqual(list.summary, 'z,b');
    }

    async '@test a getter fires an observer'(assert) {
      class List {
        items = trackedArray(['a']);

        @dependentKeyCompat
        get joined() {
          return this.items.join(',');
        }
      }

      let list = new List();
      let observer = () => assert.step(`observed ${list.joined}`);

      addObserver(list, 'joined', null, observer, false);

      // The first read connects the getter to the collection.
      assert.strictEqual(list.joined, 'a');

      list.items.push('b');
      await runLoopSettled();

      assert.verifySteps(['observed a,b']);

      removeObserver(list, 'joined', null, observer, false);
    }
  }
);

moduleFor(
  '@ember/reactive/collections | @dependentKeyCompat | trackedMap',
  class extends AbstractTestCase {
    '@test a getter that uses get() and has()'(assert) {
      class Registry {
        map = trackedMap([['a', 1]]);

        @dependentKeyCompat
        get a() {
          return this.map.get('a');
        }

        @dependentKeyCompat
        get hasB() {
          return this.map.has('b');
        }

        @computed('a', 'hasB')
        get summary() {
          return `a=${this.a} hasB=${this.hasB}`;
        }
      }

      let registry = new Registry();

      assert.strictEqual(registry.summary, 'a=1 hasB=false');

      registry.map.set('a', 10);
      assert.strictEqual(registry.summary, 'a=10 hasB=false');

      registry.map.set('b', 2);
      assert.strictEqual(registry.summary, 'a=10 hasB=true');

      registry.map.delete('a');
      assert.strictEqual(registry.summary, 'a=undefined hasB=true');

      registry.map.clear();
      assert.strictEqual(registry.summary, 'a=undefined hasB=false');
    }

    '@test a getter that reads the size and the entries'(assert) {
      class Registry {
        map = trackedMap([['a', 1]]);

        @dependentKeyCompat
        get count() {
          return this.map.size;
        }

        @dependentKeyCompat
        get pairs() {
          let result = [];

          for (let [key, value] of this.map) {
            result.push(`${key}=${value}`);
          }

          return result;
        }

        @computed('count', 'pairs')
        get summary() {
          return `${this.count}: ${this.pairs.join(',')}`;
        }
      }

      let registry = new Registry();

      assert.strictEqual(registry.summary, '1: a=1');

      registry.map.set('b', 2);
      assert.strictEqual(registry.summary, '2: a=1,b=2');

      registry.map.set('a', 10);
      assert.strictEqual(registry.summary, '2: a=10,b=2');

      registry.map.delete('a');
      assert.strictEqual(registry.summary, '1: b=2');

      registry.map.clear();
      assert.strictEqual(registry.summary, '0: ');
    }

    async '@test a getter fires an observer'(assert) {
      class Registry {
        map = trackedMap();

        @dependentKeyCompat
        get a() {
          return this.map.get('a');
        }
      }

      let registry = new Registry();
      let observer = () => assert.step(`observed ${registry.a}`);

      addObserver(registry, 'a', null, observer, false);

      // The first read connects the getter to the collection.
      assert.strictEqual(registry.a, undefined);

      registry.map.set('a', 1);
      await runLoopSettled();

      assert.verifySteps(['observed 1']);

      removeObserver(registry, 'a', null, observer, false);
    }
  }
);

moduleFor(
  '@ember/reactive/collections | @dependentKeyCompat | trackedSet',
  class extends AbstractTestCase {
    '@test a getter that uses has()'(assert) {
      class Registry {
        set = trackedSet(['a']);

        @dependentKeyCompat
        get hasB() {
          return this.set.has('b');
        }

        @computed('hasB')
        get summary() {
          return `hasB=${this.hasB}`;
        }
      }

      let registry = new Registry();

      assert.strictEqual(registry.summary, 'hasB=false');

      registry.set.add('b');
      assert.strictEqual(registry.summary, 'hasB=true');

      registry.set.delete('b');
      assert.strictEqual(registry.summary, 'hasB=false');

      registry.set.add('b');
      registry.set.clear();
      assert.strictEqual(registry.summary, 'hasB=false');
    }

    '@test a getter that reads the size and the values'(assert) {
      class Registry {
        set = trackedSet(['a']);

        @dependentKeyCompat
        get count() {
          return this.set.size;
        }

        @dependentKeyCompat
        get list() {
          return Array.from(this.set);
        }

        @computed('count', 'list')
        get summary() {
          return `${this.count}: ${this.list.join(',')}`;
        }
      }

      let registry = new Registry();

      assert.strictEqual(registry.summary, '1: a');

      registry.set.add('b');
      assert.strictEqual(registry.summary, '2: a,b');

      registry.set.delete('a');
      assert.strictEqual(registry.summary, '1: b');

      registry.set.clear();
      assert.strictEqual(registry.summary, '0: ');
    }

    async '@test a getter fires an observer'(assert) {
      class Registry {
        set = trackedSet();

        @dependentKeyCompat
        get hasA() {
          return this.set.has('a');
        }
      }

      let registry = new Registry();
      let observer = () => assert.step(`observed ${registry.hasA}`);

      addObserver(registry, 'hasA', null, observer, false);

      // The first read connects the getter to the collection.
      assert.false(registry.hasA);

      registry.set.add('a');
      await runLoopSettled();

      assert.verifySteps(['observed true']);

      removeObserver(registry, 'hasA', null, observer, false);
    }
  }
);

moduleFor(
  '@ember/reactive/collections | @dependentKeyCompat | trackedWeakMap',
  class extends AbstractTestCase {
    '@test a getter that uses get() and has()'(assert) {
      let key = {};

      class Registry {
        map = trackedWeakMap();

        @dependentKeyCompat
        get value() {
          return this.map.get(key);
        }

        @dependentKeyCompat
        get hasKey() {
          return this.map.has(key);
        }

        @computed('value', 'hasKey')
        get summary() {
          return `value=${this.value} hasKey=${this.hasKey}`;
        }
      }

      let registry = new Registry();

      assert.strictEqual(registry.summary, 'value=undefined hasKey=false');

      registry.map.set(key, 1);
      assert.strictEqual(registry.summary, 'value=1 hasKey=true');

      registry.map.set(key, 2);
      assert.strictEqual(registry.summary, 'value=2 hasKey=true');

      registry.map.delete(key);
      assert.strictEqual(registry.summary, 'value=undefined hasKey=false');
    }

    async '@test a getter fires an observer'(assert) {
      let key = {};

      class Registry {
        map = trackedWeakMap();

        @dependentKeyCompat
        get value() {
          return this.map.get(key);
        }
      }

      let registry = new Registry();
      let observer = () => assert.step(`observed ${registry.value}`);

      addObserver(registry, 'value', null, observer, false);

      // The first read connects the getter to the collection.
      assert.strictEqual(registry.value, undefined);

      registry.map.set(key, 1);
      await runLoopSettled();

      assert.verifySteps(['observed 1']);

      removeObserver(registry, 'value', null, observer, false);
    }
  }
);

moduleFor(
  '@ember/reactive/collections | @dependentKeyCompat | trackedWeakSet',
  class extends AbstractTestCase {
    '@test a getter that uses has()'(assert) {
      let value = {};

      class Registry {
        set = trackedWeakSet();

        @dependentKeyCompat
        get hasValue() {
          return this.set.has(value);
        }

        @computed('hasValue')
        get summary() {
          return `hasValue=${this.hasValue}`;
        }
      }

      let registry = new Registry();

      assert.strictEqual(registry.summary, 'hasValue=false');

      registry.set.add(value);
      assert.strictEqual(registry.summary, 'hasValue=true');

      registry.set.delete(value);
      assert.strictEqual(registry.summary, 'hasValue=false');
    }

    async '@test a getter fires an observer'(assert) {
      let value = {};

      class Registry {
        set = trackedWeakSet();

        @dependentKeyCompat
        get hasValue() {
          return this.set.has(value);
        }
      }

      let registry = new Registry();
      let observer = () => assert.step(`observed ${registry.hasValue}`);

      addObserver(registry, 'hasValue', null, observer, false);

      // The first read connects the getter to the collection.
      assert.false(registry.hasValue);

      registry.set.add(value);
      await runLoopSettled();

      assert.verifySteps(['observed true']);

      removeObserver(registry, 'hasValue', null, observer, false);
    }
  }
);
