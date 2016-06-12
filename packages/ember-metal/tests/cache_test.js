import Cache from 'ember-metal/cache';

QUnit.module('Cache');

QUnit.test('basic', function() {
  let cache = new Cache(100, key => key.toUpperCase());

  equal(cache.get('foo'), 'FOO');
  equal(cache.get('bar'), 'BAR');
  equal(cache.get('foo'), 'FOO');
});

QUnit.test('caches computation correctly', function() {
  let count = 0;
  let cache = new Cache(100, key => {
    count++;
    return key.toUpperCase();
  });

  equal(count, 0);
  cache.get('foo');
  equal(count, 1);
  cache.get('bar');
  equal(count, 2);
  cache.get('bar');
  equal(count, 2);
  cache.get('foo');
  equal(count, 2);
});

QUnit.test('handles undefined value correctly', function() {
  let cache = new Cache(100, (key) => { });

  equal(cache.get('foo'), undefined);
});

QUnit.test('continues working after reaching cache limit', function() {
  let cache = new Cache(3, key => key.toUpperCase());

  cache.get('a');
  cache.get('b');
  cache.get('c');

  equal(cache.get('d'), 'D');
  equal(cache.get('a'), 'A');
  equal(cache.get('b'), 'B');
  equal(cache.get('c'), 'C');
});
