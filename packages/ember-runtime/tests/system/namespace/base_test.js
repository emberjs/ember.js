import { context } from 'ember-environment';
import { run, get } from 'ember-metal';
import EmberObject from '../../../system/object';
import Namespace, {
  setSearchDisabled as setNamespaceSearchDisabled
} from '../../../system/namespace';

const originalLookup = context.lookup;
let lookup;

QUnit.module('Namespace', {
  setup() {
    setNamespaceSearchDisabled(false);

    lookup = context.lookup = {};
  },
  teardown() {
    setNamespaceSearchDisabled(false);

    for (let prop in lookup) {
      if (lookup[prop]) { run(lookup[prop], 'destroy'); }
    }

    context.lookup = originalLookup;
  }
});

QUnit.test('Namespace should be a subclass of EmberObject', function() {
  ok(EmberObject.detect(Namespace));
});

QUnit.test('Namespace should be duck typed', function() {
  ok(get(Namespace.create(), 'isNamespace'), 'isNamespace property is true');
});

QUnit.test('Namespace is found and named', function() {
  let nsA = lookup.NamespaceA = Namespace.create();
  equal(nsA.toString(), 'NamespaceA', 'namespaces should have a name if they are on lookup');

  let nsB = lookup.NamespaceB = Namespace.create();
  equal(nsB.toString(), 'NamespaceB', 'namespaces work if created after the first namespace processing pass');
});

QUnit.test('Classes under an Namespace are properly named', function() {
  let nsA = lookup.NamespaceA = Namespace.create();
  nsA.Foo = EmberObject.extend();
  equal(nsA.Foo.toString(), 'NamespaceA.Foo', 'Classes pick up their parent namespace');

  nsA.Bar = EmberObject.extend();
  equal(nsA.Bar.toString(), 'NamespaceA.Bar', 'New Classes get the naming treatment too');

  let nsB = lookup.NamespaceB = Namespace.create();
  nsB.Foo = EmberObject.extend();
  equal(nsB.Foo.toString(), 'NamespaceB.Foo', 'Classes in new namespaces get the naming treatment');
});

//test("Classes under Ember are properly named", function() {
//  // ES6TODO: This test does not work reliably when running independent package build with Broccoli config.
//  Ember.TestObject = EmberObject.extend({});
//  equal(Ember.TestObject.toString(), "Ember.TestObject", "class under Ember is given a string representation");
//});

QUnit.test('Lowercase namespaces are no longer supported', function() {
  let nsC = lookup.namespaceC = Namespace.create();
  equal(nsC.toString(), undefined);
});

QUnit.test('A namespace can be assigned a custom name', function() {
  let nsA = Namespace.create({
    name: 'NamespaceA'
  });

  let nsB = lookup.NamespaceB = Namespace.create({
    name: 'CustomNamespaceB'
  });

  nsA.Foo = EmberObject.extend();
  nsB.Foo = EmberObject.extend();

  equal(nsA.Foo.toString(), 'NamespaceA.Foo', 'The namespace\'s name is used when the namespace is not in the lookup object');
  equal(nsB.Foo.toString(), 'CustomNamespaceB.Foo', 'The namespace\'s name is used when the namespace is in the lookup object');
});

QUnit.test('Calling namespace.nameClasses() eagerly names all classes', function() {
  setNamespaceSearchDisabled(true);

  let namespace = lookup.NS = Namespace.create();

  namespace.ClassA = EmberObject.extend();
  namespace.ClassB = EmberObject.extend();

  Namespace.processAll();

  equal(namespace.ClassA.toString(), 'NS.ClassA');
  equal(namespace.ClassB.toString(), 'NS.ClassB');
});

QUnit.test('A namespace can be looked up by its name', function() {
  let NS = lookup.NS = Namespace.create();
  let UI = lookup.UI = Namespace.create();
  let CF = lookup.CF = Namespace.create();

  equal(Namespace.byName('NS'), NS);
  equal(Namespace.byName('UI'), UI);
  equal(Namespace.byName('CF'), CF);
});

QUnit.test('A nested namespace can be looked up by its name', function() {
  let UI = lookup.UI = Namespace.create();
  UI.Nav = Namespace.create();

  equal(Namespace.byName('UI.Nav'), UI.Nav);
});

QUnit.test('Destroying a namespace before caching lookup removes it from the list of namespaces', function() {
  let CF = lookup.CF = Namespace.create();

  run(CF, 'destroy');
  equal(Namespace.byName('CF'), undefined, 'namespace can not be found after destroyed');
});

QUnit.test('Destroying a namespace after looking up removes it from the list of namespaces', function() {
  let CF = lookup.CF = Namespace.create();

  equal(Namespace.byName('CF'), CF, 'precondition - namespace can be looked up by name');

  run(CF, 'destroy');
  equal(Namespace.byName('CF'), undefined, 'namespace can not be found after destroyed');
});
