import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';
import isEnabled from 'ember-metal/features';

var suite = SuiteModuleBuilder.create();

suite.module('contains');

suite.test('contains returns true if item is in enumerable', function() {
  var data = this.newFixture(3);
  var obj  = this.newObject(data);

  if (isEnabled('ember-runtime-enumerable-includes')) {
    expectDeprecation('`Enumerable#contains` is deprecated, use `Enumerable#includes` instead.');
  }
  equal(obj.contains(data[1]), true, 'should return true if contained');
});

suite.test('contains returns false if item is not in enumerable', function() {
  var data = this.newFixture(1);
  var obj  = this.newObject(this.newFixture(3));

  if (isEnabled('ember-runtime-enumerable-includes')) {
    expectDeprecation('`Enumerable#contains` is deprecated, use `Enumerable#includes` instead.');
  }
  equal(obj.contains(data[0]), false, 'should return false if not contained');
});

export default suite;
