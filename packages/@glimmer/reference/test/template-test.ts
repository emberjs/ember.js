import { module, test } from './utils/qunit';

import { CONSTANT_TAG, createTag, consume, dirty, value, validate } from '@glimmer/validator';

import {
  ComponentRootReference,
  HelperRootReference,
  PropertyReference,
  IterationItemReference,
  TemplatePathReference,
} from '..';
import { TestEnv } from './utils/template';
import {
  EMPTY_ARGS,
  CapturedNamedArgumentsImpl,
  CapturedPositionalArgumentsImpl,
  CapturedArgumentsImpl,
} from '@glimmer/runtime';

module('@glimmer/reference: template', () => {
  module('ComponentRootReference', () => {
    test('it creates a constant reference with the component as the value', assert => {
      let component = {};
      let ref = new ComponentRootReference(component, new TestEnv());

      assert.equal(ref.value(), component);
      assert.equal(ref.tag, CONSTANT_TAG);
    });

    test('it creates PropertyReferences when chained', assert => {
      let component = { foo: 'bar' };
      let ref = new ComponentRootReference(component, new TestEnv());
      let propRef = ref.get('foo');

      assert.ok(propRef instanceof PropertyReference);
      assert.equal(propRef.value(), 'bar');
    });

    test('it calls setTemplatePathDebugContext on the first `get`', assert => {
      let count = 0;

      let component = { foo: 'bar' };
      let ref = new ComponentRootReference(
        component,
        new (class extends TestEnv {
          setTemplatePathDebugContext(_ref: TemplatePathReference, key: string) {
            if (count === 0) {
              count++;
              assert.equal(ref, _ref);
              assert.equal(key, 'this');
            }
          }
        })()
      );

      ref.get('foo');
    });
  });

  module('HelperRootReference', () => {
    test('it calculates the helper value on initialization and creates a constant reference if the helper is constant', assert => {
      let ref = new HelperRootReference(() => 123, EMPTY_ARGS, new TestEnv());

      assert.equal(ref.value(), 123);
      assert.equal(ref.tag, CONSTANT_TAG);
    });

    test('it calculates the helper value on initialization and creates a non-constant reference if the args can change', assert => {
      let tag = createTag();
      const EMPTY_NAMED = new CapturedNamedArgumentsImpl(CONSTANT_TAG, [], []);
      const EMPTY_POSITIONAL = new CapturedPositionalArgumentsImpl(CONSTANT_TAG, []);
      const MUTABLE_ARGS = new CapturedArgumentsImpl(tag, EMPTY_POSITIONAL, EMPTY_NAMED, 0);

      let ref = new HelperRootReference(() => 123, MUTABLE_ARGS, new TestEnv());

      assert.equal(ref.value(), 123);
      assert.notEqual(ref.tag, CONSTANT_TAG);
    });

    test('it calculates the helper value on initialization and creates a non-constant reference if the helper can change', assert => {
      let tag = createTag();
      let ref = new HelperRootReference(
        () => {
          consume(tag);
          return 123;
        },
        EMPTY_ARGS,
        new TestEnv()
      );

      assert.equal(ref.value(), 123);
      assert.notEqual(ref.tag, CONSTANT_TAG);
    });

    test('it creates PropertyReferences when chained', assert => {
      let ref = new HelperRootReference(() => ({ foo: 'bar' }), EMPTY_ARGS, new TestEnv());
      let propRef = ref.get('foo');

      assert.ok(propRef instanceof PropertyReference);
      assert.equal(propRef.value(), 'bar');
    });

    test('it calls setTemplatePathDebugContext on initialization', assert => {
      const myHelper = () => 123;

      new HelperRootReference(
        myHelper,
        EMPTY_ARGS,
        new (class extends TestEnv {
          setTemplatePathDebugContext(ref: TemplatePathReference, key: string) {
            assert.ok(ref instanceof HelperRootReference);
            assert.ok(key.match(/result of a `.*` helper/));
          }
        })()
      );
    });

    test('it calls getTemplatePathDebugContext on when computing', assert => {
      const myHelper = () => 123;

      new HelperRootReference(
        myHelper,
        EMPTY_ARGS,
        new (class extends TestEnv {
          getTemplatePathDebugContext(ref: TemplatePathReference) {
            assert.ok(ref instanceof HelperRootReference);
            return '';
          }
        })()
      );
    });
  });

  module('PropertyReference', () => {
    test('it chains off the parent value', assert => {
      let component = { foo: { bar: 'baz' } };
      let ref = new ComponentRootReference(component, new TestEnv());

      let fooRef = ref.get('foo');
      assert.ok(fooRef instanceof PropertyReference);
      assert.equal(fooRef.value(), component.foo);

      let barRef = fooRef.get('bar');
      assert.ok(barRef instanceof PropertyReference);
      assert.equal(barRef.value(), component.foo.bar);
    });

    test('it tracks access', assert => {
      let tag = createTag();

      let component = {
        _foo: 123,

        get foo() {
          consume(tag);
          return this._foo;
        },

        set foo(value) {
          dirty(tag);
          this._foo = value;
        },
      };

      let ref = new ComponentRootReference(component, new TestEnv());

      let fooRef = ref.get('foo');
      assert.equal(fooRef.value(), component.foo);

      let snapshot = value(fooRef.tag);
      assert.equal(validate(fooRef.tag, snapshot), true);

      component.foo = 234;

      assert.equal(validate(fooRef.tag, snapshot), false);
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

      let ref = new ComponentRootReference(component, new TestEnv());

      let fooRef = ref.get('foo');
      fooRef.value();
      fooRef.value();
      assert.equal(count, 1);
    });

    test('it calls getPath', assert => {
      let component = {};
      let ref = new ComponentRootReference(
        component,
        new (class extends TestEnv {
          getPath(obj: unknown, key: string) {
            assert.equal(obj, component);
            assert.equal(key, 'foo');

            return 123;
          }
        })()
      );

      let fooRef = ref.get('foo');
      assert.equal(fooRef.value(), 123);
    });

    test('it calls setTemplatePathDebugContext on initialization', assert => {
      let count = 0;

      let component = { foo: 'bar' };
      let ref = new ComponentRootReference(
        component,
        new (class extends TestEnv {
          setTemplatePathDebugContext(
            childRef: TemplatePathReference,
            key: string,
            parentRef: TemplatePathReference
          ) {
            if (count === 1) {
              assert.ok(childRef instanceof PropertyReference);
              assert.equal(key, 'foo');
              assert.equal(ref, parentRef);
            }

            count++;
          }
        })()
      );

      ref.get('foo');
    });

    test('it calls getTemplatePathDebugContext on when computing', assert => {
      let component = {};
      let ref = new ComponentRootReference(
        component,
        new (class extends TestEnv {
          getTemplatePathDebugContext(childRef: TemplatePathReference) {
            assert.equal(childRef, fooRef);

            return '';
          }
        })()
      );

      let fooRef = ref.get('foo');

      fooRef.value();
    });
  });

  module('IterationItemReference', () => {
    test('it creates PropertyReferences when chained', assert => {
      let componentRef = new ComponentRootReference({}, new TestEnv());
      let itemRef = new IterationItemReference(componentRef, { foo: 'bar' }, 1, new TestEnv());
      let propRef = itemRef.get('foo');

      assert.ok(propRef instanceof PropertyReference);
      assert.equal(propRef.value(), 'bar');
    });

    test('it correctly calls setTemplatePathDebugContext', assert => {
      let componentRef = new ComponentRootReference({}, new TestEnv());

      new IterationItemReference(
        componentRef,
        { foo: 'bar' },
        1,
        new (class extends TestEnv {
          setTemplatePathDebugContext(
            childRef: TemplatePathReference,
            key: string,
            parentRef: TemplatePathReference
          ) {
            assert.ok(childRef instanceof IterationItemReference);
            assert.equal(key, 1);
            assert.equal(componentRef, parentRef);
          }
        })()
      );
    });
  });
});
