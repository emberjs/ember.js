import { context } from '@ember/-internals/environment';
import { run } from '@ember/runloop';
import { get, setNamespaceSearchDisabled } from '@ember/-internals/metal';
import { guidFor, getName } from '@ember/-internals/utils';
import EmberObject from '@ember/object';
import CoreObject from '@ember/object/core';
import Namespace from '@ember/application/namespace';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

const originalLookup = context.lookup;
let lookup;

moduleFor(
  'Namespace',
  class extends AbstractTestCase {
    beforeEach() {
      setNamespaceSearchDisabled(false);

      lookup = context.lookup = {};
    }

    afterEach() {
      setNamespaceSearchDisabled(false);

      for (let prop in lookup) {
        if (lookup[prop]) {
          run(lookup[prop], 'destroy');
        }
      }

      context.lookup = originalLookup;
    }

    ['@test Namespace should be a subclass of CoreObject'](assert) {
      assert.ok(CoreObject.detect(Namespace));
    }

    ['@test Namespace should be duck typed'](assert) {
      let namespace = Namespace.create();
      try {
        assert.ok(get(namespace, 'isNamespace'), 'isNamespace property is true');
      } finally {
        run(namespace, 'destroy');
      }
    }

    ['@test Namespace is found and named'](assert) {
      let nsA = (lookup.NamespaceA = Namespace.create());
      assert.equal(
        nsA.toString(),
        'NamespaceA',
        'namespaces should have a name if they are on lookup'
      );

      let nsB = (lookup.NamespaceB = Namespace.create());
      assert.equal(
        nsB.toString(),
        'NamespaceB',
        'namespaces work if created after the first namespace processing pass'
      );
    }

    ['@test Lowercase namespaces are no longer supported'](assert) {
      let nsC = (lookup.namespaceC = Namespace.create());
      Namespace.processAll();
      assert.equal(getName(nsC), guidFor(nsC));
    }

    ['@test A namespace can be assigned a custom name'](assert) {
      let nsA = Namespace.create({
        name: 'NamespaceA',
      });

      try {
        let nsB = (lookup.NamespaceB = Namespace.create({
          name: 'CustomNamespaceB',
        }));

        nsA.Foo = class extends EmberObject {};
        nsB.Foo = class extends EmberObject {};

        Namespace.processAll();

        assert.equal(
          getName(nsA.Foo),
          'NamespaceA.Foo',
          "The namespace's name is used when the namespace is not in the lookup object"
        );
        assert.equal(
          getName(nsB.Foo),
          'CustomNamespaceB.Foo',
          "The namespace's name is used when the namespace is in the lookup object"
        );
      } finally {
        run(nsA, 'destroy');
      }
    }

    ['@test Calling namespace.nameClasses() eagerly names all classes'](assert) {
      setNamespaceSearchDisabled(true);

      let namespace = (lookup.NS = Namespace.create());

      namespace.ClassA = class extends EmberObject {};
      namespace.ClassB = class extends EmberObject {};

      Namespace.processAll();

      assert.equal(getName(namespace.ClassA), 'NS.ClassA');
      assert.equal(getName(namespace.ClassB), 'NS.ClassB');
    }

    ['@test A namespace can be looked up by its name'](assert) {
      let NS = (lookup.NS = Namespace.create());
      let UI = (lookup.UI = Namespace.create());
      let CF = (lookup.CF = Namespace.create());

      assert.equal(Namespace.byName('NS'), NS);
      assert.equal(Namespace.byName('UI'), UI);
      assert.equal(Namespace.byName('CF'), CF);
    }

    ['@test A nested namespace can be looked up by its name'](assert) {
      let UI = (lookup.UI = Namespace.create());
      UI.Nav = Namespace.create();

      assert.equal(Namespace.byName('UI.Nav'), UI.Nav);

      run(UI.Nav, 'destroy');
    }

    ['@test Destroying a namespace before caching lookup removes it from the list of namespaces'](
      assert
    ) {
      let CF = (lookup.CF = Namespace.create());

      run(CF, 'destroy');
      assert.equal(Namespace.byName('CF'), undefined, 'namespace can not be found after destroyed');
    }

    ['@test Destroying a namespace after looking up removes it from the list of namespaces'](
      assert
    ) {
      let CF = (lookup.CF = Namespace.create());

      assert.equal(Namespace.byName('CF'), CF, 'precondition - namespace can be looked up by name');

      run(CF, 'destroy');
      assert.equal(Namespace.byName('CF'), undefined, 'namespace can not be found after destroyed');
    }
  }
);
