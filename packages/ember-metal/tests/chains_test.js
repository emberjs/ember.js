import {
  addObserver,
  get,
  ChainNode,
  finishChains,
  defineProperty,
  computed,
  notifyPropertyChange,
  peekMeta,
  meta,
  watch,
  unwatch,
  watcherCount,
} from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Chains',
  class extends AbstractTestCase {
    ['@test finishChains should properly copy chains from prototypes to instances'](assert) {
      function didChange() {}

      let obj = {};
      addObserver(obj, 'foo.bar', null, didChange);

      let childObj = Object.create(obj);

      let parentMeta = meta(obj);
      let childMeta = meta(childObj);

      finishChains(childMeta);

      assert.ok(
        parentMeta.readableChains() !== childMeta.readableChains(),
        'The chains object is copied'
      );
    }

    ['@test does not observe primitive values'](assert) {
      let obj = {
        foo: { bar: 'STRING' },
      };

      addObserver(obj, 'foo.bar.baz', null, function() {});
      let meta = peekMeta(obj);
      assert.notOk(meta._object);
    }

    ['@test observer and CP chains'](assert) {
      let obj = {};

      defineProperty(obj, 'foo', computed('qux.[]', function() {}));
      defineProperty(obj, 'qux', computed(function() {}));

      // create DK chains
      get(obj, 'foo');

      // create observer chain
      addObserver(obj, 'qux.length', function() {});

      /*
             +-----+
             | qux |   root CP
             +-----+
                ^
         +------+-----+
         |            |
     +--------+    +----+
     | length |    | [] |  chainWatchers
     +--------+    +----+
      observer       CP(foo, 'qux.[]')
    */

      // invalidate qux
      notifyPropertyChange(obj, 'qux');

      // CP chain is blown away

      /*
             +-----+
             | qux |   root CP
             +-----+
                ^
         +------+xxxxxx
         |            x
     +--------+    xxxxxx
     | length |    x [] x  chainWatchers
     +--------+    xxxxxx
      observer       CP(foo, 'qux.[]')
    */

      get(obj, 'qux'); // CP chain re-recreated
      assert.ok(true, 'no crash');
    }

    ['@test checks cache correctly'](assert) {
      let obj = {};
      let parentChainNode = new ChainNode(null, null, obj);
      let chainNode = new ChainNode(parentChainNode, 'foo');

      defineProperty(
        obj,
        'foo',
        computed(function() {
          return undefined;
        })
      );
      get(obj, 'foo');

      assert.strictEqual(chainNode.value(), undefined);
    }

    ['@test chains are watched correctly'](assert) {
      let obj = { foo: { bar: { baz: 1 } } };

      watch(obj, 'foo.bar.baz');

      assert.equal(watcherCount(obj, 'foo'), 1);
      assert.equal(watcherCount(obj, 'foo.bar'), 0);
      assert.equal(watcherCount(obj, 'foo.bar.baz'), 1);
      assert.equal(watcherCount(obj.foo, 'bar'), 1);
      assert.equal(watcherCount(obj.foo, 'bar.baz'), 0);
      assert.equal(watcherCount(obj.foo.bar, 'baz'), 1);

      unwatch(obj, 'foo.bar.baz');

      assert.equal(watcherCount(obj, 'foo'), 0);
      assert.equal(watcherCount(obj, 'foo.bar'), 0);
      assert.equal(watcherCount(obj, 'foo.bar.baz'), 0);
      assert.equal(watcherCount(obj.foo, 'bar'), 0);
      assert.equal(watcherCount(obj.foo, 'bar.baz'), 0);
      assert.equal(watcherCount(obj.foo.bar, 'baz'), 0);
    }

    ['@test chains with single character keys are watched correctly'](assert) {
      let obj = { a: { b: { c: 1 } } };

      watch(obj, 'a.b.c');

      assert.equal(watcherCount(obj, 'a'), 1);
      assert.equal(watcherCount(obj, 'a.b'), 0);
      assert.equal(watcherCount(obj, 'a.b.c'), 1);
      assert.equal(watcherCount(obj.a, 'b'), 1);
      assert.equal(watcherCount(obj.a, 'b.c'), 0);
      assert.equal(watcherCount(obj.a.b, 'c'), 1);

      unwatch(obj, 'a.b.c');

      assert.equal(watcherCount(obj, 'a'), 0);
      assert.equal(watcherCount(obj, 'a.b'), 0);
      assert.equal(watcherCount(obj, 'a.b.c'), 0);
      assert.equal(watcherCount(obj.a, 'b'), 0);
      assert.equal(watcherCount(obj.a, 'b.c'), 0);
      assert.equal(watcherCount(obj.a.b, 'c'), 0);
    }
  }
);
