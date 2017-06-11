import {
  meta
} from '..';

QUnit.module('Ember.meta');

QUnit.test('should return the same hash for an object', function() {
  let obj = {};

  meta(obj).foo = 'bar';

  equal(meta(obj).foo, 'bar', 'returns same hash with multiple calls to Ember.meta()');
});

QUnit.test('meta is not enumerable', function () {
  let proto, obj, props, prop;
  proto = { foo: 'bar' };
  meta(proto);
  obj = Object.create(proto);
  meta(obj);
  obj.bar = 'baz';
  props = [];
  for (prop in obj) {
    props.push(prop);
  }
  deepEqual(props.sort(), ['bar', 'foo']);
  if (typeof JSON !== 'undefined' && 'stringify' in JSON) {
    try {
      JSON.stringify(obj);
    } catch (e) {
      ok(false, 'meta should not fail JSON.stringify');
    }
  }
});

QUnit.test('meta.listeners basics', function(assert) {
  let t = {};
  let m = meta({});
  m.addToListeners('hello', t, 'm', 0);
  let matching = m.matchingListeners('hello');
  assert.equal(matching.length, 3);
  assert.equal(matching[0], t);
  m.removeFromListeners('hello', t, 'm');
  matching = m.matchingListeners('hello');
  assert.equal(matching, undefined);
});

QUnit.test('meta.listeners inheritance', function(assert) {
  let target = {};
  let parent = {};
  let parentMeta = meta(parent);
  parentMeta.addToListeners('hello', target, 'm', 0);

  let child = Object.create(parent);
  let m = meta(child);

  let matching = m.matchingListeners('hello');
  assert.equal(matching.length, 3);
  assert.equal(matching[0], target);
  assert.equal(matching[1], 'm');
  assert.equal(matching[2], 0);
  m.removeFromListeners('hello', target, 'm');
  matching = m.matchingListeners('hello');
  assert.equal(matching, undefined);
  matching = parentMeta.matchingListeners('hello');
  assert.equal(matching.length, 3);
});

QUnit.test('meta.listeners deduplication', function(assert) {
  let t = {};
  let m = meta({});
  m.addToListeners('hello', t, 'm', 0);
  m.addToListeners('hello', t, 'm', 0);
  let matching = m.matchingListeners('hello');
  assert.equal(matching.length, 3);
  assert.equal(matching[0], t);
});

QUnit.test('meta.writeWatching issues useful error after destroy', function(assert) {
  let target = {
    toString() { return '<special-sauce:123>'; }
  };
  let targetMeta = meta(target);

  targetMeta.destroy();

  expectAssertion(() => {
    targetMeta.writeWatching('hello', 1);
  }, 'Cannot update watchers for `hello` on `<special-sauce:123>` after it has been destroyed.');
});

QUnit.test('meta.writableTag issues useful error after destroy', function(assert) {
  let target = {
    toString() { return '<special-sauce:123>'; }
  };
  let targetMeta = meta(target);

  targetMeta.destroy();

  expectAssertion(() => {
    targetMeta.writableTag(() => {});
  }, 'Cannot create a new tag for `<special-sauce:123>` after it has been destroyed.');
});

QUnit.test('meta.writableChainWatchers issues useful error after destroy', function(assert) {
  let target = {
    toString() { return '<special-sauce:123>'; }
  };
  let targetMeta = meta(target);

  targetMeta.destroy();

  expectAssertion(() => {
    targetMeta.writableChainWatchers(() => {});
  }, 'Cannot create a new chain watcher for `<special-sauce:123>` after it has been destroyed.');
});

QUnit.test('meta.writableChains issues useful error after destroy', function(assert) {
  let target = {
    toString() { return '<special-sauce:123>'; }
  };
  let targetMeta = meta(target);

  targetMeta.destroy();

  expectAssertion(() => {
    targetMeta.writableChains(() => {});
  }, 'Cannot create a new chains for `<special-sauce:123>` after it has been destroyed.');
});

QUnit.test('meta.writeValues issues useful error after destroy', function(assert) {
  let target = {
    toString() { return '<special-sauce:123>'; }
  };
  let targetMeta = meta(target);

  targetMeta.destroy();

  expectAssertion(() => {
    targetMeta.writeValues('derp', 'ohai');
  }, 'Cannot set the value of `derp` on `<special-sauce:123>` after it has been destroyed.');
});

QUnit.test('meta.writeDeps issues useful error after destroy', function(assert) {
  let target = {
    toString() { return '<special-sauce:123>'; }
  };
  let targetMeta = meta(target);

  targetMeta.destroy();

  expectAssertion(() => {
    targetMeta.writeDeps('derp', 'ohai', 1);
  }, 'Cannot modify dependent keys for `ohai` on `<special-sauce:123>` after it has been destroyed.');
});
