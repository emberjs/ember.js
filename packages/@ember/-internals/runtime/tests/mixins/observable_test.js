import EmberObject, { computed, get } from '@ember/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'mixins/observable',
  class extends AbstractTestCase {
    ['@test should be able to retrieve cached values of computed properties without invoking the computed property'](
      assert
    ) {
      let obj = class extends EmberObject {
        @computed
        get foo() {
          return 'foo';
        }
      }.create({
        bar: 'bar',
      });

      assert.equal(
        obj.cacheFor('foo'),
        undefined,
        'should return undefined if no value has been cached'
      );
      get(obj, 'foo');

      assert.equal(get(obj, 'foo'), 'foo', 'precond - should cache the value');
      assert.equal(
        obj.cacheFor('foo'),
        'foo',
        'should return the cached value after it is invoked'
      );

      assert.equal(
        obj.cacheFor('bar'),
        undefined,
        'returns undefined if the value is not a computed property'
      );
    }
  }
);
