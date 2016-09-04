import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

suite.module('pushObjects');

suite.test('should raise exception if not Ember.Enumerable is passed to pushObjects', function() {
  let obj = this.newObject([]);

  throws(() => obj.pushObjects('string'));
});

export default suite;
