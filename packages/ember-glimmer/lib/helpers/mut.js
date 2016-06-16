import symbol from 'ember-metal/symbol';
import { assert } from 'ember-metal/debug';
import { UPDATE } from '../utils/references';
import { INVOKE } from './action';

/**
  The `mut` helper lets you __clearly specify__ that a child `Component` can update the
  (mutable) value passed to it, which will __change the value of the parent component__.

  This is very helpful for passing mutable values to a `Component` of any size, but
  critical to understanding the logic of a large/complex `Component`.

  To specify that a parameter is mutable, when invoking the child `Component`:

  ```handlebars
  {{my-child childClickCount=(mut totalClicks)}}
  ```

  The child `Component` can then modify the parent's value as needed:

  ```javascript
  // my-child.js
  export default Component.extend({
    click() {
      this.get('childClickCount').update(this.get('childClickCount').value + 1);
    }
  });
  ```

  Additionally, the `mut` helper can be combined with the `action` helper to
  mutate a value. For example:

  ```handlebars
  {{my-child childClickCount=totalClicks click-count-change=(action (mut totalClicks))}}
  ```

  The child `Component` would invoke the action with the new click value:

  ```javascript
  // my-child.js
  export default Component.extend({
    click() {
      this.get('clickCountChange')(this.get('childClickCount') + 1);
    }
  });
  ```

  The `mut` helper changes the `totalClicks` value to what was provided as the action argument.

  See a [2.0 blog post](http://emberjs.com/blog/2015/05/10/run-up-to-two-oh.html#toc_the-code-mut-code-helper) for
  additional information on using `{{mut}}`.

  @method mut
  @param {Object} [attr] the "two-way" attribute that can be modified.
  @for Ember.Templates.helpers
  @public
*/
const MUT_REFERENCE = symbol('MUT');
const SOURCE = symbol('SOURCE');

export function isMut(ref) {
  return ref && ref[MUT_REFERENCE];
}

export function unMut(ref) {
  return ref[SOURCE] || ref;
}

export default {
  isInternalHelper: true,

  toReference(args) {
    let rawRef = args.positional.at(0);

    if (isMut(rawRef)) {
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
    assert('You can only pass a path to mut', rawRef[UPDATE]);

    let wrappedRef = Object.create(rawRef);

    wrappedRef[SOURCE] = rawRef;
    wrappedRef[INVOKE] = rawRef[UPDATE];
    wrappedRef[MUT_REFERENCE] = true;

    return wrappedRef;
  }
};
