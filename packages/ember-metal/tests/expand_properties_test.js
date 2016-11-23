import expandProperties from '../expand_properties';

let foundProperties = [];

function addProperty(property) {
  foundProperties.push(property);
}

QUnit.module('Property Brace Expansion Test', {
  setup() {
    foundProperties = [];
  }
});

QUnit.test('Properties without expansions are unaffected', function() {
  expect(1);

  expandProperties('a', addProperty);
  expandProperties('a.b', addProperty);
  expandProperties('a.b.[]', addProperty);
  expandProperties('a.b.@each.c', addProperty);

  deepEqual(['a', 'a.b', 'a.b.[]', 'a.b.@each.c'].sort(), foundProperties.sort());
});

QUnit.test('A single expansion at the end expands properly', function() {
  expect(1);

  expandProperties('a.b.{c,d}', addProperty);

  deepEqual(['a.b.c', 'a.b.d'].sort(), foundProperties.sort());
});

QUnit.test('A property with only a brace expansion expands correctly', function() {
  expect(1);

  expandProperties('{a,b,c}', addProperty);

  let expected = ['a', 'b', 'c'];
  deepEqual(expected.sort(), foundProperties.sort());
});

QUnit.test('Expansions with single properties only expand once', function() {
  expect(1);

  expandProperties('a.b.{c}.d.{e}', addProperty);

  deepEqual(['a.b.c.d.e'], foundProperties);
});

QUnit.test('A single brace expansion expands correctly', function() {
  expect(1);

  expandProperties('a.{b,c,d}.e', addProperty);

  let expected = ['a.b.e', 'a.c.e', 'a.d.e'];
  deepEqual(expected.sort(), foundProperties.sort());
});

QUnit.test('Multiple brace expansions work correctly', function() {
  expect(1);

  expandProperties('{a,b,c}.d.{e,f}.g', addProperty);

  let expected = ['a.d.e.g', 'a.d.f.g', 'b.d.e.g', 'b.d.f.g', 'c.d.e.g', 'c.d.f.g'];
  deepEqual(expected.sort(), foundProperties.sort());
});

QUnit.test('A property with only brace expansions expands correctly', function() {
  expect(1);

  expandProperties('{a,b,c}.{d}.{e,f}', addProperty);

  let expected = ['a.d.e', 'a.d.f', 'b.d.e', 'b.d.f', 'c.d.e', 'c.d.f'];
  deepEqual(expected.sort(), foundProperties.sort());
});

QUnit.test('Nested brace expansions are not allowed', function() {
  let nestedBraceProperties = [
    'a.{b.{c,d}}',
    'a.{{b}.c}',
    'a.{b,c}.{d.{e,f}.g',
    'a.{b.{c}',
    'a.{b,c}}'
  ];

  nestedBraceProperties.forEach((invalidProperties) => {
    expectAssertion(() => expandProperties(invalidProperties, addProperty));
  }, /Brace expanded properties have to be balanced and cannot be nested/);
});

QUnit.test('A pattern must be a string', function() {
  expect(1);

  expectAssertion(() => {
    expandProperties([], addProperty);
  }, /A computed property key must be a string/);
});

QUnit.test('A pattern must not contain a space', function() {
  expect(1);

  expectAssertion(() => {
    expandProperties('a, b', addProperty);
  }, /Dependent keys passed to Ember\.computed\.or\(\) cannot contain spaces/);
});
