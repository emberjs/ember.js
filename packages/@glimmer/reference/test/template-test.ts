import { module, test } from './utils/qunit';

import { testOverrideGlobalContext, GlobalContext } from '@glimmer/global-context';
import { createTag, consumeTag, dirtyTag } from '@glimmer/validator';
import { EMPTY_ARGS, EMPTY_NAMED, createCapturedArgs } from '@glimmer/runtime';

import {
  ComponentRootReference,
  HelperRootReference,
  PropertyReference,
  IterationItemReference,
  UNDEFINED_REFERENCE,
} from '..';
import { TestContext } from './utils/template';

module('@glimmer/reference: template', hooks => {
  let originalContext: GlobalContext | null;

  hooks.before(() => {
    originalContext = testOverrideGlobalContext!(TestContext);
  });

  hooks.after(() => {
    testOverrideGlobalContext!(originalContext);
  });

  module('ComponentRootReference', () => {
    test('it creates a reference with the component as the value', assert => {
      let component = {};
      let ref = new ComponentRootReference(component);

      assert.equal(ref.value(), component);
    });

    test('it creates PropertyReferences when chained', assert => {
      let component = { foo: 'bar' };
      let ref = new ComponentRootReference(component);
      let propRef = ref.get('foo');

      assert.ok(propRef instanceof PropertyReference);
      assert.equal(propRef.value(), 'bar');
    });
  });

  module('HelperRootReference', () => {
    test('constant helper values are constant', assert => {
      let ref = new HelperRootReference(() => 123, EMPTY_ARGS);

      assert.equal(ref.value(), 123, 'value is calculated correctly');
      assert.ok(ref.isConst(), 'value is constant');
    });

    test('non-constant helper values are non-constant if arguments are not constant', assert => {
      let tag = createTag();

      const MUTABLE_ARGS = createCapturedArgs(EMPTY_NAMED, [
        {
          value() {
            consumeTag(tag);
            return 123;
          },
          get() {
            return UNDEFINED_REFERENCE;
          },
          isConst() {
            return false;
          },
        },
      ]);

      let ref = new HelperRootReference(args => args.positional[0].value(), MUTABLE_ARGS);

      assert.equal(ref.value(), 123, 'value is calculated correctly');
      assert.notOk(ref.isConst(), 'value is not constant');
    });

    test('non-constant helper values are non-constant if helper is not constant', assert => {
      let tag = createTag();
      let ref = new HelperRootReference(() => {
        consumeTag(tag);
        return 123;
      }, EMPTY_ARGS);

      assert.equal(ref.value(), 123, 'value is calculated correctly');
      assert.notOk(ref.isConst(), 'value is not constant');
    });

    test('it creates PropertyReferences when chained', assert => {
      let ref = new HelperRootReference(() => ({ foo: 'bar' }), EMPTY_ARGS);
      let propRef = ref.get('foo');

      assert.ok(propRef instanceof PropertyReference);
      assert.equal(propRef.value(), 'bar');
    });
  });

  module('PropertyReference', () => {
    test('it chains off the parent value', assert => {
      let component = { foo: { bar: 'baz' } };
      let ref = new ComponentRootReference(component);

      let fooRef = ref.get('foo');
      assert.ok(fooRef instanceof PropertyReference);
      assert.equal(fooRef.value(), component.foo);

      let barRef = fooRef.get('bar');
      assert.ok(barRef instanceof PropertyReference);
      assert.equal(barRef.value(), component.foo.bar);
    });

    test('it tracks access', assert => {
      let tag = createTag();
      let count = 0;

      let component = {
        _foo: 123,

        get foo() {
          count++;
          consumeTag(tag);
          return this._foo;
        },

        set foo(value) {
          dirtyTag(tag);
          this._foo = value;
        },
      };

      let ref = new ComponentRootReference(component);

      let fooRef = ref.get('foo');
      assert.equal(fooRef.value(), 123, 'gets the value correctly');
      assert.equal(count, 1, 'getter is actually called');

      assert.equal(fooRef.value(), 123, 'gets the value correctly');
      assert.equal(count, 1, 'getter is not called again');

      component.foo = 234;

      assert.equal(fooRef.value(), 234, 'gets the value correctly');
      assert.equal(count, 2, 'getter is called again after update');
    });

    test('it correctly caches values', assert => {
      let count = 0;

      let component = {
        _foo: 123,

        get foo() {
          count++;
          return this._foo;
        },
      };

      let ref = new ComponentRootReference(component);

      let fooRef = ref.get('foo');
      fooRef.value();
      fooRef.value();
      assert.equal(count, 1);
    });

    test('it calls getProp', assert => {
      let component = {};
      let ref = new ComponentRootReference(component);

      let originalContext = testOverrideGlobalContext!({
        getProp(obj: unknown, key: string) {
          assert.equal(obj, component);
          assert.equal(key, 'foo');

          return 123;
        },
      });

      try {
        let fooRef = ref.get('foo');
        assert.equal(fooRef.value(), 123);
      } finally {
        testOverrideGlobalContext!(originalContext);
      }
    });
  });

  module('IterationItemReference', () => {
    test('it creates PropertyReferences when chained', assert => {
      let componentRef = new ComponentRootReference({});
      let itemRef = new IterationItemReference(componentRef, { foo: 'bar' }, 1);
      let propRef = itemRef.get('foo');

      assert.ok(propRef instanceof PropertyReference);
      assert.equal(propRef.value(), 'bar');
    });
  });
});
