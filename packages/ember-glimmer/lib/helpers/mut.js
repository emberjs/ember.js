import { MutableReference } from '../utils/references';
import { assert } from 'ember-metal/debug';
import { isConst } from 'glimmer-reference';

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
  {{my-child childClickCount=totalClicks click-count-change=(action (mut "totalClicks"))}}
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

  @public
  @method mut
  @param {Object} [attr] the "two-way" attribute that can be modified.
  @for Ember.Templates.helpers
  @public
*/

export default {
  isInternalHelper: true,
  toReference(args) {
    assert(
      'mut helper cannot be called with multiple params or hash params',
      args.positional.values.length === 1 && !args.named.map
    );

    let source = args.positional.at(0);

    // isConst is probably not what we want, more like, isNotReference.
    assert(
      'You can only pass in references to the mut helper, not primitive values',
      !isConst(source)
    );

    return new MutableReference(source);
  }
};
