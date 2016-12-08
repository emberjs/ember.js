import { get } from 'ember-metal';
import EmberObject from '../../system/object';
import compare from '../../compare';
import Comparable from '../../mixins/comparable';

const Rectangle = EmberObject.extend(Comparable, {
  length: 0,
  width: 0,

  area() {
    return get(this, 'length') * get(this, 'width');
  },

  compare(a, b) {
    return compare(a.area(), b.area());
  }

});

let r1, r2;

QUnit.module('Comparable', {
  setup() {
    r1 = Rectangle.create({ length: 6, width: 12 });
    r2 = Rectangle.create({ length: 6, width: 13 });
  }
});

QUnit.test('should be comparable and return the correct result', function() {
  equal(Comparable.detect(r1), true);
  equal(compare(r1, r1), 0);
  equal(compare(r1, r2), -1);
  equal(compare(r2, r1), 1);
});
