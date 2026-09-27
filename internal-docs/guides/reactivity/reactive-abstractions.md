### `@tracked`

The `@tracked` accessor creates a single reactive value that that is accessed and mutated through a 
JavaScript property. It satisfies the reactivity laws:

1. **Dependency Tracking**: This requirement is satisfied for root state as long as reads
  of the root state consume the same tag that is updated when the root state is changed. It is
  trivial to verify that the implementation of `@tracked` satisfies these requirements.

2. **Value Coherence**: This requirement is also satisfied for root state as long as writes to the
   root storage always write to the same JavaScript storage location that is accessed when the root
   state is accessed. It is trivial to verify that the implementation of `@tracked` satisfies this
   requirement.

3. **Transactional Consistency**: This requirement is trivially satisfied for root state by Ember's
   "backtracking rerender assertion." This assertion ensures that once a reactive value has been
   _read_ during a rendering transaction, it cannot be updated again during the same transaction.

4. **Snapshot Immutability**: In this case, the property is snapshotted when the property is read
   and when the tag is consumed by the current tracking frame. It is trivial to verify that the
   `get` operation does not advance the timeline.

5. **Defined Granularity**: The `@tracked` accessor is specified to invalidate whenever the property
   is set, regardless of previous or subsequent value. The new value is _never_ considered
   equivalent to the previous value.

<details>
<summary>Pseudo-Implementation of <code>@tracked</code></summary>

```ts
export function tracked(_value, context) {
  context.addInitializer(function () {
    ValueTag.init(this, context.name);
  });

  return {
    get() {
      const tag = ValueTag.get(this, context.name);
      tag.consume();
      return context.access.get(this);
    },

    set(value) {
      const tag = ValueTag.get(this, context.name);
      context.access.set(this, value);
      tag.update();
    },
  };
}
```

</details>

### `Cell`

The new `cell` API satisfies the reactivity laws:

1. **Dependency Tracking**: This requirement is satisfied for root state as long as reads
  of the root state consume the same tag that is updated when the root state is changed. It is
  trivial to verify that the implementation of `cell` satisfies these requirements.

2. **Value Coherence**: This requirement is also satisfied for root state as long as writes to the
   root storage always write to the same JavaScript storage location that is accessed when the root
   state is accessed. It is trivial to verify that the implementation of `cell` satisfies this
   requirement.

3. **Transactional Consistency**: This requirement is trivially satisfied for root state by Ember's
   "backtracking rerender assertion." This assertion ensures that once a reactive value has been
   _read_ during a rendering transaction, it cannot be updated again during the same transaction.

4. **Snapshot Immutability**: In this case, the property is snapshotted when the property is read
   and when the tag is consumed by the current tracking frame. It is trivial to verify that the
   `get` operation does not advance the timeline.

5. **Defined Granularity**: When the cell is set, the new value is compared to the previous value for 
   equivalence using the specified `equals` function. When the new value is equivalent to the 
   previous value, the cell's tag will _not_ invalidate.

<details>
<summary>Pseudo-Implementation of the <code>cell</code> constructor</summary>

```ts
export function cell(value, { equals = Object.is } = {}) {
  const tag = ValueTag.init(this, 'value');

  return {
    get() {
      tag.consume();
      return value;
    },

    set(newValue) {
      if (!equals(value, newValue)) {
        value = newValue;
        tag.update();
      }
    },
  };
}
```

</details>

### The `createCache` Primitive API

The `createCache` primitive API satisfies the reactivity laws:

1. **Dependency Tracking**: The cache's computation uses `begin()` and `commit()` to automatically
   track the reactive values used in the computation. Since the tag returned by `commit` produces
   the maximum revision of its members, the cache will invalidate whenever any of the reactive values
   used in the computation have changed.

2. **Value Coherence**: This requirement is satisfied by the cache's implementation, which only
   returns a previously cached value if its tag is still valid. When the tag is invalidated, the
   cache recomputes its value before returning it, ensuring it never returns a stale value.

3. **Transactional Consistency**: This requirement is satisfied by consuming the combined tag
   during every read, regardless of whether the cache was valid or invalid. Since Ember's backtracking
   rerender assertion fires whenever a tag that was previously consumed is updated during the same
   rendering transaction, this requirement is enforced.

4. **Snapshot Immutability**: In this case, snapshotting occurs when `getCache` is called. The
   implementation only consumes tags during this operation and doesn't update any tags, ensuring
   that reading a cache doesn't advance the timeline. This property holds recursively for the
   entire computation, as each reactive value accessed during execution must also
   satisfy the same immutability requirement.

5. **Defined Granularity**: The granularity of the `createCache` API is defined transitively - 
   the cache invalidates whenever any of its dependencies invalidate, according to their own 
   granularity rules. The cache itself does not add any additional equivalence checks.

<details>
<summary>Pseudo-Implementation of <code>createCache</code></summary>

```ts
const COMPUTE = new WeakMap();

export function createCache(fn) {
  const cache = {};
  let last = undefined;

  COMPUTE.set(cache, () => {
    if (last && last.revision >= last.tag.revision) {
      runtime.consume(last.tag);
      return last.value;
    }

    runtime.begin();
    try {
      const result = fn();
      const tag = runtime.commit();
      runtime.consume(tag);
      last = { value: result, tag, revision: runtime.current() };
      return result;
    } catch {
      last = undefined;
    }
  });

  return cache;
}

export function getCache(cache) {
  const fn = COMPUTE.get(cache);

  if (!fn) {
    throw new Error('You must only call `getCache` with the return value of `createCache`');
  }

  return fn();
}
```

</details>

### The `LocalCopy` Primitive

> [!NOTE]
>
> This section will be written next. The crux of the matter is that `LocalCopy` satisfies the
> reactivity laws because:
>
> 1. Snapshotting a `LocalCopy` deterministically returns the value that corresponds to the latest
>    the upstream computation or the local cell, whichever is more recent.
> 2. Since the backtracking rerender assertion prevents any tag from being updated once it's
>    consumed, it is impossible for the choice of upstream computation or local cell to change in
>    the same rendering transaction.
> 3. What's weird about `LocalCopy` is that its value is determined in part by the _revision_ of the
>    members of the composition, whereas most compositions are determined entirely by the _values_
>    of the members.
> 4. By being explicit about reactivity semantics and the reactivity laws, we can see that
>    `LocalCopy` is a safe abstraction despite having a dependency on the revision of the members.

An implementation of `LocalCopy` exists in [composition.ts](./pseudocode/composition.ts) with
comments that explain how the implementation satisfies the reactivity laws.