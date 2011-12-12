// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.Namespace', {
  teardown: function() {
    if (window.NamespaceA) { window.NamespaceA.destroy(); }
    if (window.NamespaceB) { window.NamespaceB.destroy(); }
  }
});

test('Ember.Namespace should be a subclass of Ember.Object', function() {
  ok(Ember.Object.detect(Ember.Namespace));
});

test('Ember.Namespace is found and named', function() {
  var nsA = window.NamespaceA = Ember.Namespace.create();
  equal(nsA.toString(), "NamespaceA", "namespaces should have a name if they are on window");

  var nsB = window.NamespaceB = Ember.Namespace.create();
  equal(nsB.toString(), "NamespaceB", "namespaces work if created after the first namespace processing pass");
});

test("Classes under Ember.Namespace are properly named", function() {
  var nsA = window.NamespaceA = Ember.Namespace.create();
  nsA.Foo = Ember.Object.extend();
  equal(nsA.Foo.toString(), "NamespaceA.Foo", "Classes pick up their parent namespace");

  nsA.Bar = Ember.Object.extend();
  equal(nsA.Bar.toString(), "NamespaceA.Bar", "New Classes get the naming treatment too");

  var nsB = window.NamespaceB = Ember.Namespace.create();
  nsB.Foo = Ember.Object.extend();
  equal(nsB.Foo.toString(), "NamespaceB.Foo", "Classes in new namespaces get the naming treatment");
});
