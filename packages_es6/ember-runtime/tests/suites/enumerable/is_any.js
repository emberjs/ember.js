import EmberObject from "ember-runtime/system/object";
import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';

var suite = SuiteModuleBuilder.create();

// ..........................................................
// isAny()
//

suite.module('isAny');

suite.test('should return true of any property matches', function() {
  var obj = this.newObject([
    { foo: 'foo', bar: 'BAZ' },
    EmberObject.create({ foo: 'foo', bar: 'bar' })
  ]);

  equal(obj.isAny('foo', 'foo'), true, 'isAny(foo)');
  equal(obj.isAny('bar', 'bar'), true, 'isAny(bar)');
  equal(obj.isAny('bar', 'BIFF'), false, 'isAny(BIFF)');
});

suite.test('should return true of any property is true', function() {
  var obj = this.newObject([
    { foo: 'foo', bar: true },
    EmberObject.create({ foo: 'bar', bar: false })
  ]);

  // different values - all eval to true
  equal(obj.isAny('foo'), true, 'isAny(foo)');
  equal(obj.isAny('bar'), true, 'isAny(bar)');
  equal(obj.isAny('BIFF'), false, 'isAny(biff)');
});

suite.test('should return true if any property matches null', function() {
  var obj = this.newObject([
    { foo: null, bar: 'bar' },
    EmberObject.create({ foo: 'foo', bar: null })
  ]);

  equal(obj.isAny('foo', null), true, "isAny('foo', null)");
  equal(obj.isAny('bar', null), true, "isAny('bar', null)");
});

suite.test('should return true if any property is undefined', function() {
  var obj = this.newObject([
    { foo: undefined, bar: 'bar' },
    EmberObject.create({ foo: 'foo' })
  ]);

  equal(obj.isAny('foo', undefined), true, "isAny('foo', undefined)");
  equal(obj.isAny('bar', undefined), true, "isAny('bar', undefined)");
});

suite.test('should not match undefined properties without second argument', function() {
  var obj = this.newObject([
    { foo: undefined },
    EmberObject.create({ })
  ]);

  equal(obj.isAny('foo'), false, "isAny('foo', undefined)");
});

suite.test('anyBy should be aliased to isAny', function() {
  var obj = this.newObject();
  equal(obj.isAny, obj.anyBy);
});

suite.test('isAny should be aliased to someProperty', function() {
  var obj = this.newObject();
  equal(obj.someProperty, obj.isAny);
});

export default suite;
