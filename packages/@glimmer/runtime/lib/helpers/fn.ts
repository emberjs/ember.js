import { DEBUG } from '@glimmer/env';
import type { AnyFn, CapturedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { check } from '@glimmer/debug/lib/stack-check';
import buildUntouchableThis from '@glimmer/debug-util/lib/untouchable-this';
import {
  createComputeRef,
  isInvokableRef,
  parentRefFor,
  updateRef,
  valueForRef,
} from '@glimmer/reference/lib/reference';

import { reifyPositional } from '../vm/arguments';
import { internalHelper } from './internal-helper';

const context = buildUntouchableThis('`fn` helper');

/**
  The `fn` helper allows you to ensure a function that you are passing off
  to another component, helper, or modifier has access to arguments that are
  available in the template.

  For example, if you have an `each` helper looping over a number of items, you
  may need to pass a function that expects to receive the item as an argument
  to a component invoked within the loop. Here's how you could use the `fn`
  helper to pass both the function and its arguments together:

  ```app/components/items-listing.gjs
  import DisplayItem from './display-item';
    
  <template>
    {{#each @items as |item|}}
      <DisplayItem @item=item @select={{fn this.handleSelected item}} />
    {{/each}}
  </template>
  ```

  ```app/components/items-list.gjs
  import Component from '@glimmer/component';
  import { action } from '@ember/object';

  export default class ItemsList extends Component {
    handleSelected = (item) => {
      // ...snip...
    }
  }
  ```

  In this case the `DisplayItem` component will receive a normal function
  that it can invoke. When it invokes the function, the `handleSelected`
  function will receive the `item` and any arguments passed, thanks to the
  `fn` helper.

  Let's take look at what that means in a couple circumstances:

  - When invoked as `this.args.select()` the `handleSelected` function will
    receive the `item` from the loop as its first and only argument.
  - When invoked as `this.args.select('foo')` the `handleSelected` function
    will receive the `item` from the loop as its first argument and the
    string `'foo'` as its second argument.

  In the example above, we used an arrow function to ensure that
  `handleSelected` is properly bound to the `items-list`, but a regular method
  works as well:

  ```app/components/items-list.gjs
  import Component from '@glimmer/component';

  export default class ItemsList extends Component {
    handleSelected(item) {
      // ...snip...
    }
  }
  ```

  When the function passed to `fn` is a path like `this.handleSelected`, it is
  invoked with the object it was read from as its `this` — the same `this`
  JavaScript would use for `this.handleSelected(item)`. Functions that are
  already bound (arrow functions, `.bind()`ed functions) are unaffected.

  See also [partial application](https://en.wikipedia.org/wiki/Partial_application).

  `fn` is built-in and does not require any additional imports.
 
  @method fn
  @public
*/
export const fn = internalHelper(({ positional }: CapturedArguments) => {
  let callbackRef = check(positional[0], assertCallbackIsFn);

  return createComputeRef(
    () => {
      return (...invocationArgs: unknown[]) => {
        let [fn, ...args] = reifyPositional(positional);

        if (DEBUG) assertCallbackIsFn(callbackRef);

        if (isInvokableRef(callbackRef)) {
          let value = args.length > 0 ? args[0] : invocationArgs[0];
          return void updateRef(callbackRef, value);
        } else {
          // When the callback was a property read (`this.foo`, `item.greet`, ...),
          // invoke it with the same `this` JavaScript would use for `obj.foo()`.
          let parentRef = parentRefFor(callbackRef);
          let self = parentRef !== null ? valueForRef(parentRef) : context;

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- @fixme
          return (fn as AnyFn).call(self, ...args, ...invocationArgs);
        }
      };
    },
    null,
    'fn'
  );
});

function assertCallbackIsFn(callbackRef: Reference | undefined): asserts callbackRef is Reference {
  if (
    !(
      callbackRef &&
      (isInvokableRef(callbackRef) || typeof valueForRef(callbackRef) === 'function')
    )
  ) {
    throw new Error(
      `You must pass a function as the \`fn\` helper's first argument, you passed ${
        callbackRef ? valueForRef(callbackRef) : callbackRef
      }. While rendering:\n\n${callbackRef?.debugLabel}`
    );
  }
}
