import Ember from "ember-metal/core";
import expandProperties from "ember-metal/expand_properties";

var foundProperties = [];

function addProperty(property) {
  foundProperties.push(property);
}

QUnit.module('Property Brace Expansion Test', {
  setup: function() {
    foundProperties = [];
  }
});

test('Properties without expansions are unaffected', function() {
  expect(1);

  expandProperties('a', addProperty);
  expandProperties('a.b', addProperty);
  expandProperties('a.b.@each', addProperty);

  deepEqual(['a', 'a.b', 'a.b.@each'].sort(), foundProperties.sort());
});

test('A single expansion at the end expands properly', function() {
  expect(1);

  expandProperties('a.b.{c,d}', addProperty);

  deepEqual(['a.b.c', 'a.b.d'].sort(), foundProperties.sort());
});

test('A property with only a brace expansion expands correctly', function() {
  expect(1);

  expandProperties('{a,b,c}', addProperty);

  var expected = ['a', 'b', 'c'];
  deepEqual(expected.sort(), foundProperties.sort());
});

if (!Ember.FEATURES.isEnabled('property-brace-expansion-improvement')) {
  test('A brace expansion at the beginning doesn\'t expand' , function() {
    expect(1);

    expandProperties('{a,b,c}.d', addProperty);

    deepEqual(['{a,b,c}.d'], foundProperties);
  });
}

if (Ember.FEATURES.isEnabled('property-brace-expansion-improvement')) {
  test('Expansions with single properties only expand once', function() {
    expect(1);

    expandProperties('a.b.{c}.d.{e}', addProperty);

    deepEqual(['a.b.c.d.e'], foundProperties);
  });

  test('A single brace expansion expands correctly', function() {
    expect(1);

    expandProperties('a.{b,c,d}.e', addProperty);

    var expected = ['a.b.e', 'a.c.e', 'a.d.e'];
    deepEqual(expected.sort(), foundProperties.sort());
  });

  test('Multiple brace expansions work correctly', function() {
    expect(1);

    expandProperties('{a,b,c}.d.{e,f}.g', addProperty);

    var expected = ['a.d.e.g', 'a.d.f.g', 'b.d.e.g', 'b.d.f.g', 'c.d.e.g', 'c.d.f.g'];
    deepEqual(expected.sort(), foundProperties.sort());
  });

  test('A property with only brace expansions expands correctly', function() {
    expect(1);

    expandProperties('{a,b,c}.{d}.{e,f}', addProperty);

    var expected = ['a.d.e', 'a.d.f', 'b.d.e', 'b.d.f', 'c.d.e', 'c.d.f'];
    deepEqual(expected.sort(), foundProperties.sort());
  });
}
