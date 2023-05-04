import { DEBUG } from '@glimmer/env';
import { dict, unwrap } from '@glimmer/util';
import { consumeTag, createTag, dirtyTag } from '@glimmer/validator';

import { GlobalContext, testOverrideGlobalContext } from '../../global-context';
import {
  childRefFor,
  createComputeRef,
  createConstRef,
  createDebugAliasRef,
  createInvokableRef,
  createReadOnlyRef,
  createUnboundRef,
  isInvokableRef,
  isUpdatableRef,
  updateRef,
  valueForRef,
} from '..';
import { tracked } from './support';

const { module, test } = QUnit;

class TrackedDict<T> {
  private tag = createTag();
  private data = dict<T>();

  get(key: string): T {
    consumeTag(this.tag);
    return unwrap(this.data[key]);
  }

  set(key: string, value: T) {
    dirtyTag(this.tag);
    return (this.data[key] = value);
  }
}

module('References', (hooks) => {
  let originalContext: GlobalContext | null;
  let getCount = 0;
  let setCount = 0;

  hooks.beforeEach(() => {
    originalContext = testOverrideGlobalContext!({
      getProp(obj: object, key: string): unknown {
        getCount++;
        return (obj as Record<string, unknown>)[key];
      },

      setProp(obj: object, key: string, value: unknown) {
        setCount++;
        (obj as Record<string, unknown>)[key] = value;
      },

      scheduleRevalidate() {},
    });
  });

  hooks.afterEach(() => {
    testOverrideGlobalContext!(originalContext);
  });

  hooks.beforeEach(() => {
    getCount = 0;
    setCount = 0;
  });

  module('const ref', () => {
    test('it works', (assert) => {
      let value = {};
      let constRef = createConstRef(value, 'test');

      assert.strictEqual(valueForRef(constRef), value, 'value is correct');
      assert.notOk(isUpdatableRef(constRef), 'value is not updatable');
    });

    test('can create children of const refs', (assert) => {
      class Parent {
        @tracked child = 123;
      }

      let parent = new Parent();

      let constRef = createConstRef(parent, 'test');
      let childRef = childRefFor(constRef, 'child');

      assert.strictEqual(valueForRef(childRef), 123, 'value is correct');
      assert.strictEqual(valueForRef(childRef), 123, 'value is correct');
      assert.strictEqual(getCount, 1, 'get called correct number of times');

      parent.child = 456;

      assert.strictEqual(valueForRef(childRef), 456, 'value updated correctly');
      assert.strictEqual(valueForRef(childRef), 456, 'value is correct');
      assert.strictEqual(getCount, 2, 'get called correct number of times');

      assert.true(isUpdatableRef(childRef), 'childRef is updatable');

      updateRef(childRef, 789);

      assert.strictEqual(valueForRef(childRef), 789, 'value updated correctly');
      assert.strictEqual(getCount, 3, 'get called correct number of times');
      assert.strictEqual(setCount, 1, 'set called correct number of times');
    });
  });

  module('compute ref', () => {
    test('compute reference caches computation', (assert) => {
      let count = 0;

      let dict = new TrackedDict<string>();
      let ref = createComputeRef(() => {
        count++;
        return dict.get('foo');
      });

      dict.set('foo', 'bar');

      assert.strictEqual(count, 0, 'precond');

      assert.strictEqual(valueForRef(ref), 'bar');
      assert.strictEqual(valueForRef(ref), 'bar');
      assert.strictEqual(valueForRef(ref), 'bar');

      assert.strictEqual(count, 1, 'computed');

      dict.set('foo', 'BAR');

      assert.strictEqual(valueForRef(ref), 'BAR');
      assert.strictEqual(valueForRef(ref), 'BAR');
      assert.strictEqual(valueForRef(ref), 'BAR');

      assert.strictEqual(count, 2, 'computed');

      dict.set('baz', 'bat');

      assert.strictEqual(valueForRef(ref), 'BAR');
      assert.strictEqual(valueForRef(ref), 'BAR');
      assert.strictEqual(valueForRef(ref), 'BAR');

      assert.strictEqual(count, 3, 'computed');

      dict.set('foo', 'bar');

      assert.strictEqual(valueForRef(ref), 'bar');
      assert.strictEqual(valueForRef(ref), 'bar');
      assert.strictEqual(valueForRef(ref), 'bar');

      assert.strictEqual(count, 4, 'computed');
    });

    test('compute refs cache nested computation correctly', (assert) => {
      let count = 0;

      let first = new TrackedDict<string>();
      let second = new TrackedDict<string>();

      let innerRef = createComputeRef(() => {
        count++;
        return first.get('foo');
      });
      let outerRef = createComputeRef(() => valueForRef(innerRef));

      first.set('foo', 'bar');

      assert.strictEqual(count, 0, 'precond');

      assert.strictEqual(valueForRef(outerRef), 'bar');
      assert.strictEqual(valueForRef(outerRef), 'bar');
      assert.strictEqual(valueForRef(outerRef), 'bar');

      assert.strictEqual(count, 1, 'computed');

      second.set('foo', 'BAR');

      assert.strictEqual(valueForRef(outerRef), 'bar');
      assert.strictEqual(valueForRef(outerRef), 'bar');
      assert.strictEqual(valueForRef(outerRef), 'bar');

      assert.strictEqual(count, 1, 'computed');

      first.set('foo', 'BAR');

      assert.strictEqual(valueForRef(outerRef), 'BAR');
      assert.strictEqual(valueForRef(outerRef), 'BAR');
      assert.strictEqual(valueForRef(outerRef), 'BAR');

      assert.strictEqual(count, 2, 'computed');
    });

    test('can create children of compute refs', (assert) => {
      class Child {
        @tracked value = 123;
      }

      class Parent {
        @tracked child = new Child();
      }

      let parent = new Parent();

      let computeRef = createComputeRef(() => parent.child);
      let valueRef = childRefFor(computeRef, 'value');

      assert.strictEqual(valueForRef(valueRef), 123, 'value is correct');
      assert.strictEqual(valueForRef(valueRef), 123, 'value is correct');
      assert.strictEqual(getCount, 1, 'get called correct number of times');

      parent.child.value = 456;

      assert.strictEqual(valueForRef(valueRef), 456, 'value updated correctly');
      assert.strictEqual(valueForRef(valueRef), 456, 'value is correct');
      assert.strictEqual(getCount, 2, 'get called correct number of times');

      assert.true(isUpdatableRef(valueRef), 'childRef is updatable');

      updateRef(valueRef, 789);

      assert.strictEqual(valueForRef(valueRef), 789, 'value updated correctly');
      assert.strictEqual(getCount, 3, 'get called correct number of times');
      assert.strictEqual(setCount, 1, 'set called correct number of times');

      parent.child = new Child();

      assert.strictEqual(valueForRef(valueRef), 123, 'value updated correctly when parent changes');
      assert.strictEqual(getCount, 4, 'get called correct number of times');
    });
  });

  module('unbound ref', () => {
    test('it works', (assert) => {
      let value = {};
      let constRef = createUnboundRef(value, 'test');

      assert.strictEqual(valueForRef(constRef), value, 'value is correct');
      assert.notOk(isUpdatableRef(constRef), 'value is not updatable');
    });

    test('children of unbound refs are not reactive', (assert) => {
      class Parent {
        @tracked child = 123;
      }

      let parent = new Parent();

      let constRef = createUnboundRef(parent, 'test');
      let childRef = childRefFor(constRef, 'child');

      assert.strictEqual(valueForRef(childRef), 123, 'value is correct');

      parent.child = 456;

      assert.strictEqual(valueForRef(childRef), 123, 'value updated correctly');
    });
  });

  module('invokable ref', () => {
    test('can create invokable refs', (assert) => {
      let ref = createComputeRef(
        () => {},
        () => {}
      );

      let invokableRef = createInvokableRef(ref);

      assert.ok(isInvokableRef(invokableRef));
    });

    test('can create children of invokable refs', (assert) => {
      class Child {
        @tracked value = 123;
      }

      class Parent {
        @tracked child = new Child();
      }

      let parent = new Parent();

      let computeRef = createComputeRef(
        () => parent.child,
        (value) => (parent.child = value)
      );
      let invokableRef = createInvokableRef(computeRef);
      let valueRef = childRefFor(invokableRef, 'value');

      assert.strictEqual(valueForRef(valueRef), 123, 'value is correct');
      assert.strictEqual(valueForRef(valueRef), 123, 'value is correct');
      assert.strictEqual(getCount, 1, 'get called correct number of times');

      parent.child.value = 456;

      assert.strictEqual(valueForRef(valueRef), 456, 'value updated correctly');
      assert.strictEqual(valueForRef(valueRef), 456, 'value is correct');
      assert.strictEqual(getCount, 2, 'get called correct number of times');

      assert.true(isUpdatableRef(valueRef), 'childRef is updatable');

      updateRef(valueRef, 789);

      assert.strictEqual(valueForRef(valueRef), 789, 'value updated correctly');
      assert.strictEqual(getCount, 3, 'get called correct number of times');
      assert.strictEqual(setCount, 1, 'set called correct number of times');

      parent.child = new Child();

      assert.strictEqual(valueForRef(valueRef), 123, 'value updated correctly when parent changes');
      assert.strictEqual(getCount, 4, 'get called correct number of times');
    });
  });

  module('read only ref', () => {
    test('can convert an updatable ref to read only', (assert) => {
      class Parent {
        @tracked child = 123;
      }

      let parent = new Parent();

      let computeRef = createComputeRef(
        () => parent.child,
        (value) => (parent.child = value)
      );

      let readOnlyRef = createReadOnlyRef(computeRef);

      assert.ok(isUpdatableRef(computeRef), 'original ref is updatable');
      assert.notOk(isUpdatableRef(readOnlyRef), 'read only ref is not updatable');
    });

    test('can create children of read only refs', (assert) => {
      class Child {
        @tracked value = 123;
      }

      class Parent {
        @tracked child = new Child();
      }

      let parent = new Parent();

      let computeRef = createComputeRef(
        () => parent.child,
        (value) => (parent.child = value)
      );
      let readOnlyRef = createReadOnlyRef(computeRef);
      let valueRef = childRefFor(readOnlyRef, 'value');

      assert.strictEqual(valueForRef(valueRef), 123, 'value is correct');
      assert.strictEqual(valueForRef(valueRef), 123, 'value is correct');
      assert.strictEqual(getCount, 1, 'get called correct number of times');

      parent.child.value = 456;

      assert.strictEqual(valueForRef(valueRef), 456, 'value updated correctly');
      assert.strictEqual(valueForRef(valueRef), 456, 'value is correct');
      assert.strictEqual(getCount, 2, 'get called correct number of times');

      assert.true(isUpdatableRef(valueRef), 'childRef is updatable');

      updateRef(valueRef, 789);

      assert.strictEqual(valueForRef(valueRef), 789, 'value updated correctly');
      assert.strictEqual(getCount, 3, 'get called correct number of times');
      assert.strictEqual(setCount, 1, 'set called correct number of times');

      parent.child = new Child();

      assert.strictEqual(valueForRef(valueRef), 123, 'value updated correctly when parent changes');
      assert.strictEqual(getCount, 4, 'get called correct number of times');
    });
  });

  if (DEBUG) {
    module('debugAliasRef', () => {
      test('debug alias refs are transparent', (assert) => {
        class Foo {
          @tracked value = 123;
        }

        let foo = new Foo();

        let original = createComputeRef(
          () => foo.value,
          (newValue) => (foo.value = newValue)
        );

        let alias = createDebugAliasRef!('@test', original);

        assert.strictEqual(valueForRef(original), 123, 'alias returns correct value');
        assert.strictEqual(valueForRef(alias), 123, 'alias returns correct value');
        assert.ok(isUpdatableRef(alias), 'alias is updatable');

        updateRef(alias, 456);

        assert.strictEqual(valueForRef(original), 456, 'alias returns correct value');
        assert.strictEqual(valueForRef(alias), 456, 'alias returns correct value');

        let readOnly = createReadOnlyRef(original);
        let readOnlyAlias = createDebugAliasRef!('@test', readOnly);

        assert.strictEqual(valueForRef(readOnly), 456, 'alias returns correct value');
        assert.strictEqual(valueForRef(readOnlyAlias), 456, 'alias returns correct value');
        assert.notOk(isUpdatableRef(readOnly), 'alias is not updatable');

        let invokable = createInvokableRef(original);
        let invokableAlias = createDebugAliasRef!('@test', invokable);

        assert.ok(isInvokableRef(invokableAlias), 'alias is invokable');
      });
    });
  }
});
