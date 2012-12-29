// ==========================================================================
// Project:  Ember Runtime
// ==========================================================================

var get = Ember.get, originalLookup = Ember.lookup, lookup;

module('Ember.Namespace', {
  setup: function() {
    lookup = Ember.lookup = {};
  },
  teardown: function() {
    if (lookup.NamespaceA) { Ember.run(function(){ lookup.NamespaceA.destroy(); }); }
    if (lookup.NamespaceB) { Ember.run(function(){ lookup.NamespaceB.destroy(); }); }
    if (lookup.namespaceC) {
      try {
        Ember.TESTING_DEPRECATION = true;
        Ember.run(function(){
          lookup.namespaceC.destroy();
        });
      } finally {
        Ember.TESTING_DEPRECATION = false;
      }
    }

    Ember.lookup = originalLookup;
  }
});

test('Ember.Namespace should be a subclass of Ember.Object', function() {
  ok(Ember.Object.detect(Ember.Namespace));
});

test("Ember.Namespace should be duck typed", function() {
  ok(get(Ember.Namespace.create(), 'isNamespace'), "isNamespace property is true");
});

test('Ember.Namespace is found and named', function() {
  var nsA = lookup.NamespaceA = Ember.Namespace.create();
  equal(nsA.toString(), "NamespaceA", "namespaces should have a name if they are on lookup");

  var nsB = lookup.NamespaceB = Ember.Namespace.create();
  equal(nsB.toString(), "NamespaceB", "namespaces work if created after the first namespace processing pass");
});

test("Classes under an Ember.Namespace are properly named", function() {
  var nsA = lookup.NamespaceA = Ember.Namespace.create();
  nsA.Foo = Ember.Object.extend();
  equal(nsA.Foo.toString(), "NamespaceA.Foo", "Classes pick up their parent namespace");

  nsA.Bar = Ember.Object.extend();
  equal(nsA.Bar.toString(), "NamespaceA.Bar", "New Classes get the naming treatment too");

  var nsB = lookup.NamespaceB = Ember.Namespace.create();
  nsB.Foo = Ember.Object.extend();
  equal(nsB.Foo.toString(), "NamespaceB.Foo", "Classes in new namespaces get the naming treatment");
});

test("Classes under Ember are properly named", function() {
  equal(Ember.Array.toString(), "Ember.Array", "precond - existing classes are processed");

  Ember.TestObject = Ember.Object.extend({});
  equal(Ember.TestObject.toString(), "Ember.TestObject", "class under Ember is given a string representation");
});

test("Lowercase namespaces should be deprecated", function() {
  lookup.namespaceC = Ember.Namespace.create();

  var originalWarn = Ember.Logger.warn,
      loggerWarning;

  Ember.Logger.warn = function(msg) { loggerWarning = msg; };

  try {
    Ember.identifyNamespaces();
  } finally {
    Ember.Logger.warn = originalWarn;
  }

  // Ignore backtrace
  equal(loggerWarning.split("\n")[0], "DEPRECATION: Namespaces should not begin with lowercase.");
});

test("A namespace can be assigned a custom name", function() {
  var nsA = Ember.Namespace.create({
    name: "NamespaceA"
  });

  var nsB = lookup.NamespaceB = Ember.Namespace.create({
    name: "CustomNamespaceB"
  });

  nsA.Foo = Ember.Object.extend();
  nsB.Foo = Ember.Object.extend();

  equal(nsA.Foo.toString(), "NamespaceA.Foo", "The namespace's name is used when the namespace is not in the lookup object");
  equal(nsB.Foo.toString(), "CustomNamespaceB.Foo", "The namespace's name is used when the namespace is in the lookup object");
});
