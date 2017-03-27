import {
  addObserver,
  get,
  ChainNode,
  finishChains,
  defineProperty,
  computed,
  propertyDidChange,
  peekMeta
} from '..';

QUnit.module('Chains');

QUnit.test('finishChains should properly copy chains from prototypes to instances', function() {
  function didChange() {}

  let obj = {};
  addObserver(obj, 'foo.bar', null, didChange);

  let childObj = Object.create(obj);
  finishChains(childObj);
  ok(peekMeta(obj) !== peekMeta(childObj).readableChains(), 'The chains object is copied');
});

QUnit.test('does not observe primative values', function(assert) {
  let obj = {
    foo: { bar: 'STRING' }
  };

  addObserver(obj, 'foo.bar.baz', null, function() {});
  let meta = peekMeta(obj);
  assert.notOk(meta._object);
});


QUnit.test('observer and CP chains', function() {
  let obj = { };

  defineProperty(obj, 'foo', computed('qux.[]', function() { }));
  defineProperty(obj, 'qux', computed(function() { }));

  // create DK chains
  get(obj, 'foo');

  // create observer chain
  addObserver(obj, 'qux.length', function() { });

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
  propertyDidChange(obj, 'qux');

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
  ok(true, 'no crash');
});

QUnit.test('checks cache correctly', function(assert) {
  let obj = {};
  let parentChainNode = new ChainNode(null, null, obj);
  let chainNode = new ChainNode(parentChainNode, 'foo');

  defineProperty(obj, 'foo', computed(function() { return undefined; }));
  get(obj, 'foo');

  assert.strictEqual(chainNode.value(), undefined);
});
