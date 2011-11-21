// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('SC.Namespace', {
  teardown: function() {
    if (window.NamespaceA) { window.NamespaceA.destroy(); }
    if (window.NamespaceB) { window.NamespaceB.destroy(); }
  }
});

test('SC.Namespace should be a subclass of SC.Object', function() {
  ok(SC.Object.detect(SC.Namespace));
});

test('SC.Namespace is found and named', function() {
  var nsA = window.NamespaceA = SC.Namespace.create();
  equal(nsA.toString(), "NamespaceA", "namespaces should have a name if they are on window");

  var nsB = window.NamespaceB = SC.Namespace.create();
  equal(nsB.toString(), "NamespaceB", "namespaces work if created after the first namespace processing pass");
});

test("Classes under SC.Namespace are properly named", function() {
  var nsA = window.NamespaceA = SC.Namespace.create();
  nsA.Foo = SC.Object.extend();
  equal(nsA.Foo.toString(), "NamespaceA.Foo", "Classes pick up their parent namespace");

  nsA.Bar = SC.Object.extend();
  equal(nsA.Bar.toString(), "NamespaceA.Bar", "New Classes get the naming treatment too");

  var nsB = window.NamespaceB = SC.Namespace.create();
  nsB.Foo = SC.Object.extend();
  equal(nsB.Foo.toString(), "NamespaceB.Foo", "Classes in new namespaces get the naming treatment");
});
