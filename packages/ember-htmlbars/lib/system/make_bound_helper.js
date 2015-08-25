/**
@module ember
@submodule ember-htmlbars
*/
import { deprecate } from 'ember-metal/debug';
import { helper } from 'ember-htmlbars/helper';

/**
  Create a bound helper. Accepts a function that receives the ordered and hash parameters
  from the template. If a bound property was provided in the template it will be resolved to its
  value and any changes to the bound property cause the helper function to be re-run with the updated
  values.

  * `params` - An array of resolved ordered parameters.
  * `hash` - An object containing the hash parameters.

  For example:

  * With an unquoted ordered parameter:

    ```javascript
    {{x-capitalize foo}}
    ```

    Assuming `foo` was set to `"bar"`, the bound helper would receive `["bar"]` as its first argument, and
    an empty hash as its second.

  * With a quoted ordered parameter:

    ```javascript
    {{x-capitalize "foo"}}
    ```

    The bound helper would receive `["foo"]` as its first argument, and an empty hash as its second.

  * With an unquoted hash parameter:

    ```javascript
    {{x-repeat "foo" count=repeatCount}}
    ```

    Assuming that `repeatCount` resolved to 2, the bound helper would receive `["foo"]` as its first argument,
    and { count: 2 } as its second.

  @private
  @method makeBoundHelper
  @for Ember.HTMLBars
  @param {Function} fn
  @since 1.10.0
*/
export default function makeBoundHelper(fn) {
  deprecate(
    'Using `Ember.HTMLBars.makeBoundHelper` is deprecated. Please refactor to using `Ember.Helper` or `Ember.Helper.helper`.',
    false,
    { id: 'ember-htmlbars.make-bound-helper', until: '3.0.0' }
  );
  return helper(fn);
}
