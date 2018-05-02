import { run } from '@ember/runloop';
import { guidFor, setName } from 'ember-utils';
import { context } from 'ember-environment';
import EmberObject from '../../../lib/system/object';
import Namespace from '../../../lib/system/namespace';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let originalLookup = context.lookup;
let lookup;

moduleFor(
  'system/object/toString',
  class extends AbstractTestCase {
    beforeEach() {
      context.lookup = lookup = {};
    }

    afterEach() {
      context.lookup = originalLookup;
    }

    ['@test toString() returns the same value if called twice'](assert) {
      let Foo = Namespace.create();
      Foo.toString = function() {
        return 'Foo';
      };

      Foo.Bar = EmberObject.extend();

      assert.equal(Foo.Bar.toString(), 'Foo.Bar');
      assert.equal(Foo.Bar.toString(), 'Foo.Bar');

      let obj = Foo.Bar.create();

      assert.equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');
      assert.equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');

      assert.equal(Foo.Bar.toString(), 'Foo.Bar');

      run(Foo, 'destroy');
    }

    ['@test toString on a class returns a useful value when nested in a namespace'](assert) {
      let obj;

      let Foo = Namespace.create();
      Foo.toString = function() {
        return 'Foo';
      };

      Foo.Bar = EmberObject.extend();
      assert.equal(Foo.Bar.toString(), 'Foo.Bar');

      obj = Foo.Bar.create();
      assert.equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');

      Foo.Baz = Foo.Bar.extend();
      assert.equal(Foo.Baz.toString(), 'Foo.Baz');

      obj = Foo.Baz.create();
      assert.equal(obj.toString(), '<Foo.Baz:' + guidFor(obj) + '>');

      obj = Foo.Bar.create();
      assert.equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');

      run(Foo, 'destroy');
    }

    ['@test toString on a namespace finds the namespace in lookup'](assert) {
      let Foo = (lookup.Foo = Namespace.create());

      assert.equal(Foo.toString(), 'Foo');

      run(Foo, 'destroy');
    }

    ['@test toString on a namespace finds the namespace in lookup'](assert) {
      let Foo = (lookup.Foo = Namespace.create());
      let obj;

      Foo.Bar = EmberObject.extend();

      assert.equal(Foo.Bar.toString(), 'Foo.Bar');

      obj = Foo.Bar.create();
      assert.equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');

      run(Foo, 'destroy');
    }

    ['@test toString on a namespace falls back to modulePrefix, if defined'](assert) {
      let Foo = Namespace.create({ modulePrefix: 'foo' });

      assert.equal(Foo.toString(), 'foo');

      run(Foo, 'destroy');
    }

    ['@test toString includes toStringExtension if defined'](assert) {
      let Foo = EmberObject.extend({
        toStringExtension() {
          return 'fooey';
        },
      });
      let foo = Foo.create();
      let Bar = EmberObject.extend({});
      let bar = Bar.create();

      // simulate these classes being defined on a Namespace
      setName(Foo, 'Foo');
      setName(Bar, 'Bar');

      assert.equal(
        bar.toString(),
        '<Bar:' + guidFor(bar) + '>',
        'does not include toStringExtension part'
      );
      assert.equal(
        foo.toString(),
        '<Foo:' + guidFor(foo) + ':fooey>',
        'Includes toStringExtension result'
      );
    }
  }
);
