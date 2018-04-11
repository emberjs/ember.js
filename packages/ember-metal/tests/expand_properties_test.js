import { expandProperties } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let foundProperties = [];

function addProperty(property) {
  foundProperties.push(property);
}

moduleFor(
  'Property Brace Expansion Test',
  class extends AbstractTestCase {
    beforeEach() {
      foundProperties = [];
    }

    ['@test Properties without expansions are unaffected'](assert) {
      assert.expect(1);

      expandProperties('a', addProperty);
      expandProperties('a.b', addProperty);
      expandProperties('a.b.[]', addProperty);
      expandProperties('a.b.@each.c', addProperty);

      assert.deepEqual(['a', 'a.b', 'a.b.[]', 'a.b.@each.c'].sort(), foundProperties.sort());
    }

    ['@test A single expansion at the end expands properly'](assert) {
      assert.expect(1);

      expandProperties('a.b.{c,d}', addProperty);

      assert.deepEqual(['a.b.c', 'a.b.d'].sort(), foundProperties.sort());
    }

    ['@test A property with only a brace expansion expands correctly'](assert) {
      assert.expect(1);

      expandProperties('{a,b,c}', addProperty);

      let expected = ['a', 'b', 'c'];
      assert.deepEqual(expected.sort(), foundProperties.sort());
    }

    ['@test Expansions with single properties only expand once'](assert) {
      assert.expect(1);

      expandProperties('a.b.{c}.d.{e}', addProperty);

      assert.deepEqual(['a.b.c.d.e'], foundProperties);
    }

    ['@test A single brace expansion expands correctly'](assert) {
      assert.expect(1);

      expandProperties('a.{b,c,d}.e', addProperty);

      let expected = ['a.b.e', 'a.c.e', 'a.d.e'];
      assert.deepEqual(expected.sort(), foundProperties.sort());
    }

    ['@test Multiple brace expansions work correctly'](assert) {
      assert.expect(1);

      expandProperties('{a,b,c}.d.{e,f}.g', addProperty);

      let expected = ['a.d.e.g', 'a.d.f.g', 'b.d.e.g', 'b.d.f.g', 'c.d.e.g', 'c.d.f.g'];
      assert.deepEqual(expected.sort(), foundProperties.sort());
    }

    ['@test A property with only brace expansions expands correctly'](assert) {
      assert.expect(1);

      expandProperties('{a,b,c}.{d}.{e,f}', addProperty);

      let expected = ['a.d.e', 'a.d.f', 'b.d.e', 'b.d.f', 'c.d.e', 'c.d.f'];
      assert.deepEqual(expected.sort(), foundProperties.sort());
    }

    ['@test Nested brace expansions are not allowed']() {
      let nestedBraceProperties = [
        'a.{b.{c,d}}',
        'a.{{b}.c}',
        'a.{b,c}.{d.{e,f}.g',
        'a.{b.{c}',
        'a.{b,c}}',
        'model.{bar,baz',
      ];

      nestedBraceProperties.forEach(invalidProperties => {
        expectAssertion(() => expandProperties(invalidProperties, addProperty));
      }, /Brace expanded properties have to be balanced and cannot be nested/);
    }

    ['@test A property with no braces does not expand'](assert) {
      assert.expect(1);

      expandProperties('a,b,c.d.e,f', addProperty);

      assert.deepEqual(foundProperties, ['a,b,c.d.e,f']);
    }

    ['@test A pattern must be a string'](assert) {
      assert.expect(1);

      expectAssertion(() => {
        expandProperties([1, 2], addProperty);
      }, /A computed property key must be a string/);
    }

    ['@test A pattern must not contain a space'](assert) {
      assert.expect(1);

      expectAssertion(function() {
        expandProperties('{a, b}', addProperty);
      }, /Brace expanded properties cannot contain spaces, e.g. "user.{firstName, lastName}" should be "user.{firstName,lastName}"/);
    }
  }
);
