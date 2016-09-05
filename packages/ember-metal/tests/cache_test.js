import Cache from '../cache';

QUnit.module('Cache');

QUnit.test('basic', function() {
  let cache = new Cache(100, key => key.toUpperCase());

  equal(cache.get('foo'), 'FOO');
  equal(cache.get('bar'), 'BAR');
  equal(cache.get('foo'), 'FOO');
});

QUnit.test('explicit sets', function() {
  let cache = new Cache(100, key => key.toUpperCase());

  equal(cache.get('foo'), 'FOO');

  equal(cache.set('foo', 'FOO!!!'), 'FOO!!!');

  equal(cache.get('foo'), 'FOO!!!');

  strictEqual(cache.set('foo', undefined), undefined);

  strictEqual(cache.get('foo'), undefined);
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

QUnit.test('caches computation correctly with custom cache keys', function() {
  let count = 0;
  let cache = new Cache(
    100,
    obj => {
      count++;
      return obj.value.toUpperCase();
    },
    obj => obj.key
  );

  equal(count, 0);
  cache.get({ key: 'foo', value: 'foo' });
  equal(count, 1);
  cache.get({ key: 'bar', value: 'bar' });
  equal(count, 2);
  cache.get({ key: 'bar', value: 'bar' });
  equal(count, 2);
  cache.get({ key: 'foo', value: 'foo' });
  equal(count, 2);
});

QUnit.test('handles undefined value correctly', function() {
  let count = 0;
  let cache = new Cache(100, key => { count++; });

  equal(count, 0);
  strictEqual(cache.get('foo'), undefined);
  equal(count, 1);
  strictEqual(cache.get('bar'), undefined);
  equal(count, 2);
  strictEqual(cache.get('bar'), undefined);
  equal(count, 2);
  strictEqual(cache.get('foo'), undefined);
  equal(count, 2);
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
