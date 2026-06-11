/**
@module ember
*/
import { assert } from '@ember/debug';
import type { CapturedArguments } from '@glimmer/interfaces';
import { createInvokableRef, isUpdatableRef } from '@glimmer/reference/lib/reference';
import { internalHelper } from './internal-helper';

/**
  The `mut` helper is a shortcut for updating for args.
    
  However, defining update functions on your backing class is preferable to using `mut`.

  The `mut` helper, when used with `fn`, will return a function that
  sets the value passed to `mut` to its first argument. As an example, we can create a
  button that increments a value passing the value directly to the `fn`:

  ```handlebars
  <MyChild @childClickCount={{this.totalClicks}} @clickCountChange={{fn (mut this.totalClicks)}} />
  ```

  The child `Component` would invoke the function with the new click count:

  ```app/components/my-child.gjs
  import Component from '@glimmer/component';
  import { action } from '@ember/object';
  import { on } from '@ember/modifier';
    
  export default class MyChild extends Component {
    @action
    update() {
      this.args.clickCountChange(this.args.childClickCount + 1);
    }
    
    <template>
      <button {{on "click" this.update}}>
        Click me!
      </button>
    </template>
  }
  ```

  The `mut` helper changes the `totalClicks` value to what was provided as the `fn` argument.

  @method mut
  @param {Object} [attr] the "two-way" attribute that can be modified.
  @for Ember.Templates.helpers
  @public
*/

export default internalHelper(({ positional }: CapturedArguments) => {
  let ref = positional[0];
  assert('expected at least one positional arg', ref);

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
  assert('You can only pass a path to mut', isUpdatableRef(ref));

  return createInvokableRef(ref);
});
