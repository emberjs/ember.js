import COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE from '../../lib/system/dasherize-component-name';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'dasherize-component-name',
  class extends AbstractTestCase {
    ['@test names are correctly dasherized'](assert) {
      assert.strictEqual(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo'), 'foo');
      assert.strictEqual(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('foo-bar'), 'foo-bar');
      assert.strictEqual(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('FooBar'), 'foo-bar');
      assert.strictEqual(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('F3Bar'), 'f3-bar');
      assert.strictEqual(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo3Bar'), 'foo3-bar');
      assert.strictEqual(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo3barBaz'), 'foo3bar-baz');
      assert.strictEqual(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('FooB3ar'), 'foo-b3ar');
      assert.strictEqual(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('XBlah'), 'x-blah');
      assert.strictEqual(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('X-Blah'), 'x-blah');
      assert.strictEqual(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo@BarBaz'), 'foo@bar-baz');
      assert.strictEqual(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo@Bar-Baz'), 'foo@bar-baz');
      assert.strictEqual(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo::BarBaz'), 'foo/bar-baz');
      assert.strictEqual(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo::Bar-Baz'), 'foo/bar-baz');
      assert.strictEqual(
        COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo::BarBaz::Bang'),
        'foo/bar-baz/bang'
      );
    }
  }
);
