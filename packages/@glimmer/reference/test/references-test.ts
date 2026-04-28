import { DEBUG } from '@glimmer/env';
import { unwrap } from '@glimmer/debug-util';
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
} from '@glimmer/reference';
import { dict } from '@glimmer/util';
import { consumeTag, createTag, dirtyTag } from '@glimmer/validator';

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
if (DEBUG) {
  module('References', () => {
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

        parent.child = 456;

        assert.strictEqual(valueForRef(childRef), 456, 'value updated correctly');
        assert.strictEqual(valueForRef(childRef), 456, 'value is correct');

        assert.true(isUpdatableRef(childRef), 'childRef is updatable');

        updateRef(childRef, 789);

        assert.strictEqual(valueForRef(childRef), 789, 'value updated correctly');
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

        dict.set('foo', 'bar');

        assert.strictEqual(valueForRef(ref), 'bar');
        assert.strictEqual(valueForRef(ref), 'bar');
        assert.strictEqual(valueForRef(ref), 'bar');

        assert.strictEqual(count, 3, 'computed');
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

        parent.child.value = 456;

        assert.strictEqual(valueForRef(valueRef), 456, 'value updated correctly');
        assert.strictEqual(valueForRef(valueRef), 456, 'value is correct');

        assert.true(isUpdatableRef(valueRef), 'childRef is updatable');

        updateRef(valueRef, 789);

        assert.strictEqual(valueForRef(valueRef), 789, 'value updated correctly');

        parent.child = new Child();

        assert.strictEqual(
          valueForRef(valueRef),
          123,
          'value updated correctly when parent changes'
        );
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

        parent.child.value = 456;

        assert.strictEqual(valueForRef(valueRef), 456, 'value updated correctly');
        assert.strictEqual(valueForRef(valueRef), 456, 'value is correct');

        assert.true(isUpdatableRef(valueRef), 'childRef is updatable');

        updateRef(valueRef, 789);

        assert.strictEqual(valueForRef(valueRef), 789, 'value updated correctly');

        parent.child = new Child();

        assert.strictEqual(
          valueForRef(valueRef),
          123,
          'value updated correctly when parent changes'
        );
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

        parent.child.value = 456;

        assert.strictEqual(valueForRef(valueRef), 456, 'value updated correctly');
        assert.strictEqual(valueForRef(valueRef), 456, 'value is correct');

        assert.true(isUpdatableRef(valueRef), 'childRef is updatable');

        updateRef(valueRef, 789);

        assert.strictEqual(valueForRef(valueRef), 789, 'value updated correctly');

        parent.child = new Child();

        assert.strictEqual(
          valueForRef(valueRef),
          123,
          'value updated correctly when parent changes'
        );
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

          let alias = unwrap(createDebugAliasRef)('@test', original);

          assert.strictEqual(valueForRef(original), 123, 'alias returns correct value');
          assert.strictEqual(valueForRef(alias), 123, 'alias returns correct value');
          assert.ok(isUpdatableRef(alias), 'alias is updatable');

          updateRef(alias, 456);

          assert.strictEqual(valueForRef(original), 456, 'alias returns correct value');
          assert.strictEqual(valueForRef(alias), 456, 'alias returns correct value');

          let readOnly = createReadOnlyRef(original);
          let readOnlyAlias = unwrap(createDebugAliasRef)('@test', readOnly);

          assert.strictEqual(valueForRef(readOnly), 456, 'alias returns correct value');
          assert.strictEqual(valueForRef(readOnlyAlias), 456, 'alias returns correct value');
          assert.notOk(isUpdatableRef(readOnly), 'alias is not updatable');

          let invokable = createInvokableRef(original);
          let invokableAlias = unwrap(createDebugAliasRef)('@test', invokable);

          assert.ok(isInvokableRef(invokableAlias), 'alias is invokable');
        });
      });
    }
  });
}
