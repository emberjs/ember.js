import {get} from 'ember-metal/property_get';
import EmberObject from 'ember-runtime/system/object';
import compare from "ember-runtime/compare";
import Comparable from 'ember-runtime/mixins/comparable';

var Rectangle = EmberObject.extend(Comparable, {
  length: 0,
  width: 0,

  area: function() {
    return get(this, 'length') * get(this, 'width');
  },

  compare: function(a, b) {
    return compare(a.area(), b.area());
  }

});

var r1, r2;

QUnit.module("Comparable", {

  setup: function() {
    r1 = Rectangle.create({ length: 6, width: 12 });
    r2 = Rectangle.create({ length: 6, width: 13 });
  },

  teardown: function() {
  }

});

QUnit.test("should be comparable and return the correct result", function() {
  equal(Comparable.detect(r1), true);
  equal(compare(r1, r1), 0);
  equal(compare(r1, r2), -1);
  equal(compare(r2, r1), 1);
});
