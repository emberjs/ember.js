import { SuiteModuleBuilder } from '../suite';
import { isFeatureEnabled } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('uniqBy');

if (isFeatureEnabled('ember-runtime-computed-uniq-by')) {
  suite.test('should return new instance with duplicates removed', function() {
    let numbers = this.newObject([
      { id: 1, value: 'one' },
      { id: 2, value: 'two' },
      { id: 1, value: 'one' }
    ]);
    deepEqual(numbers.uniqBy('id'), [
      { id: 1, value: 'one' },
      { id: 2, value: 'two' }
    ]);
  });
}

export default suite;
