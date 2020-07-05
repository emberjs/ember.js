/**
@module ember
*/
import { symbol } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { VMArguments } from '@glimmer/interfaces';
import { PathReference, UPDATE_REFERENCED_VALUE } from '@glimmer/reference';

/**
  The `mut` helper lets you __clearly specify__ that a child `Component` can update the
  (mutable) value passed to it, which will __change the value of the parent component__.

  To specify that a parameter is mutable, when invoking the child `Component`:

  ```handlebars
  <MyChild @childClickCount={{fn (mut totalClicks)}} />
  ```

   or

  ```handlebars
  {{my-child childClickCount=(mut totalClicks)}}
  ```

  The child `Component` can then modify the parent's value just by modifying its own
  property:

  ```javascript
  // my-child.js
  export default Component.extend({
    click() {
      this.incrementProperty('childClickCount');
    }
  });
  ```

  Note that for curly components (`{{my-component}}`) the bindings are already mutable,
  making the `mut` unnecessary.

  Additionally, the `mut` helper can be combined with the `fn` helper to
  mutate a value. For example:

  ```handlebars
  <MyChild @childClickCount={{this.totalClicks}} @click-count-change={{fn (mut totalClicks))}} />
  ```

  or

  ```handlebars
  {{my-child childClickCount=totalClicks click-count-change=(fn (mut totalClicks))}}
  ```

  The child `Component` would invoke the function with the new click value:

  ```javascript
  // my-child.js
  export default Component.extend({
    click() {
      this.get('click-count-change')(this.get('childClickCount') + 1);
    }
  });
  ```

  The `mut` helper changes the `totalClicks` value to what was provided as the `fn` argument.

  The `mut` helper, when used with `fn`, will return a function that
  sets the value passed to `mut` to its first argument. As an example, we can create a
  button that increments a value passing the value directly to the `fn`:

  ```handlebars
  {{! inc helper is not provided by Ember }}
  <button onclick={{fn (mut count) (inc count)}}>
    Increment count
  </button>
  ```

  @method mut
  @param {Object} [attr] the "two-way" attribute that can be modified.
  @for Ember.Templates.helpers
  @public
*/
export const INVOKE: unique symbol = symbol('INVOKE') as any;
const SOURCE: unique symbol = symbol('SOURCE') as any;

class MutReference implements PathReference {
  public [SOURCE]: PathReference;

  constructor(protected inner: PathReference) {
    this[SOURCE] = inner;
  }

  value() {
    return this.inner.value();
  }

  isConst() {
    return this.inner.isConst();
  }

  get(key: string): PathReference {
    return this.inner.get(key);
  }

  [UPDATE_REFERENCED_VALUE](value: unknown) {
    return this.inner[UPDATE_REFERENCED_VALUE](value);
  }

  [INVOKE](value: unknown) {
    return this.inner[UPDATE_REFERENCED_VALUE](value);
  }
}

export function unMut(ref: PathReference) {
  return ref[SOURCE] || ref;
}

export default function(args: VMArguments) {
  let rawRef = args.positional.at(0);

  if (typeof rawRef[INVOKE] === 'function') {
    return rawRef;
  }

  // TODO: Improve this error message. This covers at least two distinct
  // cases:
  //
  // 1. (mut "not a path") – passing a literal, result from a helper
  //    invocation, etc
  //
  // 2. (mut receivedValue) – passing a value received from the caller
  //    that was originally derived from a literal, result from a helper
  //    invocation, etc
  //
  // This message is alright for the first case, but could be quite
  // confusing for the second case.
  assert('You can only pass a path to mut', rawRef[UPDATE_REFERENCED_VALUE] !== undefined);

  return new MutReference(rawRef);
}
