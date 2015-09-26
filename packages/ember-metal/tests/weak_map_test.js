import WeakMap from 'ember-metal/weak_map';

QUnit.module('Ember.WeakMap');

QUnit.test('has weakMap like qualities', function(assert) {
  var map = new WeakMap();
  var map2 = new WeakMap();

  var a = {};
  var b = {};
  var c = {};

  equal(map.get(a), undefined);
  equal(map.get(b), undefined);
  equal(map.get(c), undefined);

  equal(map2.get(a), undefined);
  equal(map2.get(b), undefined);
  equal(map2.get(c), undefined);

  equal(map.set(a,  1), map, 'map.set should return itself');
  equal(map.get(a), 1);
  equal(map.set(b,  undefined), map);
  equal(map.set(a, 2), map);
  equal(map.get(a), 2);
  equal(map.set(b,  undefined), map);

  equal(map2.get(a), undefined);
  equal(map2.get(b), undefined);
  equal(map2.get(c), undefined);

  equal(map.set(c, 1), map);
  equal(map.get(c), 1);
  equal(map.get(a), 2);
  equal(map.get(b), undefined);

  equal(map2.set(a, 3), map2);
  equal(map2.set(b, 4), map2);
  equal(map2.set(c, 5), map2);

  equal(map2.get(a), 3);
  equal(map2.get(b), 4);
  equal(map2.get(c), 5);

  equal(map.get(c), 1);
  equal(map.get(a), 2);
  equal(map.get(b), undefined);
});
