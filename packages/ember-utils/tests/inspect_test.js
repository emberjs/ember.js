import { HAS_NATIVE_SYMBOL, inspect } from '..';
import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';

moduleFor(
  'Ember.inspect',
  class extends TestCase {
    ['@test strings'](assert) {
      assert.equal(inspect('foo'), '"foo"');
    }

    ['@test numbers'](assert) {
      assert.equal(inspect(2.6), '2.6');
    }

    ['@test null'](assert) {
      assert.equal(inspect(null), 'null');
    }

    ['@test undefined'](assert) {
      assert.equal(inspect(undefined), 'undefined');
    }

    ['@test true'](assert) {
      assert.equal(inspect(true), 'true');
    }

    ['@test false'](assert) {
      assert.equal(inspect(false), 'false');
    }

    ['@test object'](assert) {
      assert.equal(inspect({}), '{ }');
      assert.equal(inspect({ foo: 'bar' }), '{ foo: "bar" }');
      assert.equal(
        inspect({
          foo() {
            return this;
          },
        }),
        '{ foo: [Function:foo] }'
      );
    }

    ['@test objects without a prototype'](assert) {
      let prototypelessObj = Object.create(null);
      prototypelessObj.a = 1;
      prototypelessObj.b = [Object.create(null)];
      assert.equal(inspect({ foo: prototypelessObj }), '{ foo: { a: 1, b: [ { } ] } }');
    }

    ['@test array'](assert) {
      assert.equal(inspect([1, 2, 3]), '[ 1, 2, 3 ]');
    }

    ['@test array list limit'](assert) {
      let a = [];
      for (let i = 0; i < 120; i++) {
        a.push(1);
      }
      assert.equal(inspect(a), `[ ${a.slice(0, 100).join(', ')}, ... 20 more items ]`);
    }

    ['@test object list limit'](assert) {
      let obj = {};
      let pairs = [];
      for (let i = 0; i < 120; i++) {
        obj['key' + i] = i;
        pairs.push(`key${i}: ${i}`);
      }
      assert.equal(inspect(obj), `{ ${pairs.slice(0, 100).join(', ')}, ... 20 more keys }`);
    }

    ['@test depth limit'](assert) {
      assert.equal(
        inspect([[[['here', { a: 1 }, [1]]]]]),
        '[ [ [ [ "here", [Object], [Array] ] ] ] ]'
      );
    }

    ['@test odd key'](assert) {
      assert.equal(
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
      assert.equal(obj.inspect(depth, options), obj);
    }

    ['@test cycle'](assert) {
      let obj = {};
      obj.a = obj;
      let arr = [obj];
      arr.push(arr);
      assert.equal(inspect(arr), '[ { a: [Circular] }, [Circular] ]');
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

      assert.equal(
        inspect([new Component(), Component]),
        '[ <@ember/component:ember234>, @ember/component ]'
      );
    }

    ['@test regexp'](assert) {
      assert.equal(inspect(/regexp/), '/regexp/');
    }

    ['@test date'](assert) {
      let inspected = inspect(new Date('Sat Apr 30 2011 13:24:11'));
      assert.ok(inspected.match(/Sat Apr 30/), 'The inspected date has its date');
      assert.ok(inspected.match(/2011/), 'The inspected date has its year');
      assert.ok(inspected.match(/13:24:11/), 'The inspected date has its time');
    }

    ['@test inspect outputs the toString() representation of Symbols'](assert) {
      if (HAS_NATIVE_SYMBOL) {
        let symbol = Symbol('test');
        assert.equal(inspect(symbol), 'Symbol(test)');
      } else {
        assert.expect(0);
      }
    }
  }
);
