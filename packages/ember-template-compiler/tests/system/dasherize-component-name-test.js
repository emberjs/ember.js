import COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE from '../../lib/system/dasherize-component-name';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'dasherize-component-name',
  class extends AbstractTestCase {
    ['@test names are correctly dasherized'](assert) {
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo'), 'foo');
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('foo-bar'), 'foo-bar');
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('FooBar'), 'foo-bar');
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('F3Bar'), 'f3-bar');
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo3Bar'), 'foo3-bar');
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo3barBaz'), 'foo3bar-baz');
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('FooB3ar'), 'foo-b3ar');
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('XBlah'), 'x-blah');
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('X-Blah'), 'x-blah');
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo::BarBaz'), 'foo::bar-baz');
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo::Bar-Baz'), 'foo::bar-baz');
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo@BarBaz'), 'foo@bar-baz');
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get('Foo@Bar-Baz'), 'foo@bar-baz');
    }
  }
);
