import EmberObject from 'ember-runtime/system/object';
import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';

var suite = SuiteModuleBuilder.create();

suite.module('invoke');

suite.test('invoke should call on each object that implements', function() {
  var cnt, ary, obj;

  function F(amt) {
    cnt += amt===undefined ? 1 : amt;
  }
  cnt = 0;
  ary = [
    { foo: F },
    EmberObject.create({ foo: F }),

    // NOTE: does not impl foo - invoke should just skip
    EmberObject.create({ bar: F }),

    { foo: F }
  ];

  obj = this.newObject(ary);
  obj.invoke('foo');
  equal(cnt, 3, 'should have invoked 3 times');

  cnt = 0;
  obj.invoke('foo', 2);
  equal(cnt, 6, 'should have invoked 3 times, passing param');
});

export default suite;
