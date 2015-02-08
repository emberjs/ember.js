import {SuiteModuleBuilder} from 'ember-runtime/tests/suites/suite';

var suite = SuiteModuleBuilder.create();

suite.module('pushObjects');

suite.test("should raise exception if not Ember.Enumerable is passed to pushObjects", function() {
  var obj = this.newObject([]);

  throws(function() {
    obj.pushObjects("string");
  });
});

export default suite;
