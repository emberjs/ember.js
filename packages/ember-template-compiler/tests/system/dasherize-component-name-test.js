import COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE from '../../lib/system/dasherize-component-name';

QUnit.module('dasherize-component-name', function() {
  function equals(input, expected) {
    QUnit.test(`${input} -> ${expected}`, function(assert) {
      assert.equal(COMPONENT_NAME_SIMPLE_DASHERIZE_CACHE.get(input), expected);
    });
  }

  equals('Foo', 'foo');
  equals('foo-bar', 'foo-bar');
  equals('FooBar', 'foo-bar');
  equals('XBlah', 'x-blah');
  equals('X-Blah', 'x-blah');
  equals('Foo::BarBaz', 'foo::bar-baz');
  equals('Foo::Bar-Baz', 'foo::bar-baz');
  equals('Foo@BarBaz', 'foo@bar-baz');
  equals('Foo@Bar-Baz', 'foo@bar-baz');
});
