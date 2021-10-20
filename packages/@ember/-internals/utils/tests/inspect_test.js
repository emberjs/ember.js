import { inspect } from '..';
import { AbstractTestCase as TestCase, moduleFor } from 'internal-test-helpers';

moduleFor(
  'Ember.inspect',
  class extends TestCase {
    ['@test strings'](assert) {
      assert.strictEqual(inspect('foo'), '"foo"');
    }

    ['@test numbers'](assert) {
      assert.strictEqual(inspect(2.6), '2.6');
    }

    ['@test null'](assert) {
      assert.strictEqual(inspect(null), 'null');
    }

    ['@test undefined'](assert) {
      assert.strictEqual(inspect(undefined), 'undefined');
    }

    ['@test true'](assert) {
      assert.strictEqual(inspect(true), 'true');
    }

    ['@test false'](assert) {
      assert.strictEqual(inspect(false), 'false');
    }

    ['@test object'](assert) {
      assert.strictEqual(inspect({}), '{ }');
      assert.strictEqual(inspect({ foo: 'bar' }), '{ foo: "bar" }');
      let obj = {
        foo() {
          return this;
        },
      };
      assert.strictEqual(inspect(obj), `{ foo: [Function:foo] }`);
    }

    ['@test objects without a prototype'](assert) {
      let prototypelessObj = Object.create(null);
      prototypelessObj.a = 1;
      prototypelessObj.b = [Object.create(null)];
      assert.strictEqual(inspect({ foo: prototypelessObj }), '{ foo: { a: 1, b: [ { } ] } }');
    }

    ['@test array'](assert) {
      assert.strictEqual(inspect([1, 2, 3]), '[ 1, 2, 3 ]');
    }

    ['@test array list limit'](assert) {
      let a = [];
      for (let i = 0; i < 120; i++) {
        a.push(1);
      }
      assert.strictEqual(inspect(a), `[ ${a.slice(0, 100).join(', ')}, ... 20 more items ]`);
    }

    ['@test object list limit'](assert) {
      let obj = {};
      let pairs = [];
      for (let i = 0; i < 120; i++) {
        obj['key' + i] = i;
        pairs.push(`key${i}: ${i}`);
      }
      assert.strictEqual(inspect(obj), `{ ${pairs.slice(0, 100).join(', ')}, ... 20 more keys }`);
    }

    ['@test depth limit'](assert) {
      assert.strictEqual(
        inspect([[[['here', { a: 1 }, [1]]]]]),
        '[ [ [ [ "here", [Object], [Array] ] ] ] ]'
      );
    }

    ['@test odd key'](assert) {
      assert.strictEqual(
        inspect({
          [`Hello world!
How are you?`]: 1,
        }),
        '{ "Hello world!\\nHow are you?": 1 }'
      );
    }

    ['@test node call'](assert) {
      let obj = { a: 1 };
      obj.inspect = inspect;
      let depth = 2;
      let options = {};
      assert.strictEqual(obj.inspect(depth, options), obj);
    }

    ['@test cycle'](assert) {
      let obj = {};
      obj.a = obj;
      let arr = [obj];
      arr.push(arr);
      assert.strictEqual(inspect(arr), '[ { a: [Circular] }, [Circular] ]');
    }

    ['@test custom toString'](assert) {
      class Component {
        static toString() {
          return '@ember/component';
        }

        toString() {
          return `<${this.constructor}:ember234>`;
        }
      }

      assert.strictEqual(
        inspect([new Component(), Component]),
        '[ <@ember/component:ember234>, @ember/component ]'
      );
    }

    ['@test regexp'](assert) {
      assert.strictEqual(inspect(/regexp/), '/regexp/');
    }

    ['@test date'](assert) {
      let inspected = inspect(new Date('Sat Apr 30 2011 13:24:11'));
      assert.ok(inspected.match(/Sat Apr 30/), 'The inspected date has its date');
      assert.ok(inspected.match(/2011/), 'The inspected date has its year');
      assert.ok(inspected.match(/13:24:11/), 'The inspected date has its time');
    }

    ['@test inspect outputs the toString() representation of Symbols'](assert) {
      let symbol = Symbol('test');
      assert.strictEqual(inspect(symbol), 'Symbol(test)');
    }
  }
);
