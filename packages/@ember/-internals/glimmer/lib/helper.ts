/**
@module @ember/component
*/

import { Factory } from '@ember/-internals/owner';
import { FrameworkObject, setFrameworkClass } from '@ember/-internals/runtime';
import { symbol } from '@ember/-internals/utils';
import { join } from '@ember/runloop';
import { Dict } from '@glimmer/interfaces';
import { createTag, dirty } from '@glimmer/reference';

export const RECOMPUTE_TAG = symbol('RECOMPUTE_TAG');

export type HelperFunction = (positional: unknown[], named: Dict<unknown>) => unknown;

export type SimpleHelperFactory = Factory<SimpleHelper, HelperFactory<SimpleHelper>>;
export type ClassHelperFactory = Factory<HelperInstance, HelperFactory<HelperInstance>>;

export interface HelperFactory<T> {
  isHelperFactory: true;
  create(): T;
}

export interface HelperInstance {
  compute(positional: unknown[], named: Dict<unknown>): unknown;
  destroy(): void;
}

export interface SimpleHelper {
  compute: HelperFunction;
}

export function isHelperFactory(
  helper: any | undefined | null
): helper is SimpleHelperFactory | ClassHelperFactory {
  return (
    typeof helper === 'object' && helper !== null && helper.class && helper.class.isHelperFactory
  );
}

export function isSimpleHelper(helper: SimpleHelper | HelperInstance): helper is SimpleHelper {
  return (helper as any).destroy === undefined;
}

/**
  Ember Helpers are functions that can compute values, and are used in templates.
  For example, this code calls a helper named `format-currency`:

  ```app/templates/application.hbs
  <Cost @cents={{230}} />
  ```

  ```app/components/cost.hbs
  <div>{{format-currency @cents currency="$"}}</div>
  ```

  Additionally a helper can be called as a nested helper.
  In this example, we show the formatted currency value if the `showMoney`
  named argument is truthy.

  ```handlebars
  {{if @showMoney (format-currency @cents currency="$")}}
  ```

  Helpers defined using a class must provide a `compute` function. For example:

  ```app/helpers/format-currency.js
  import Helper from '@ember/component/helper';

  export default class extends Helper {
    compute([cents], { currency }) {
      return `${currency}${cents * 0.01}`;
    }
  }
  ```

  Each time the input to a helper changes, the `compute` function will be
  called again.

  As instances, these helpers also have access to the container and will accept
  injected dependencies.

  Additionally, class helpers can call `recompute` to force a new computation.

  @class Helper
  @public
  @since 1.13.0
*/
let Helper = FrameworkObject.extend({
  init() {
    this._super(...arguments);
    this[RECOMPUTE_TAG] = createTag();
  },

  /**
    On a class-based helper, it may be useful to force a recomputation of that
    helpers value. This is akin to `rerender` on a component.

    For example, this component will rerender when the `currentUser` on a
    session service changes:

    ```app/helpers/current-user-email.js
    import Helper from '@ember/component/helper'
    import { inject as service } from '@ember/service'
    import { observer } from '@ember/object'

    export default Helper.extend({
      session: service(),

      onNewUser: observer('session.currentUser', function() {
        this.recompute();
      }),

      compute() {
        return this.get('session.currentUser.email');
      }
    });
    ```

    @method recompute
    @public
    @since 1.13.0
  */
  recompute() {
    join(() => dirty(this[RECOMPUTE_TAG]));
  },

  /**
    Override this function when writing a class-based helper.

    @method compute
    @param {Array} params The positional arguments to the helper
    @param {Object} hash The named arguments to the helper
    @public
    @since 1.13.0
  */
});

Helper.isHelperFactory = true;

setFrameworkClass(Helper);

class Wrapper implements HelperFactory<SimpleHelper> {
  isHelperFactory: true = true;

  constructor(public compute: HelperFunction) {}

  create() {
    // needs new instance or will leak containers
    return {
      compute: this.compute,
    };
  }
}

/**
  In many cases it is not necessary to use the full `Helper` class.
  The `helper` method create pure-function helpers without instances.
  For example:

  ```app/helpers/format-currency.js
  import { helper } from '@ember/component/helper';

  export default helper(function([cents], {currency}) {
    return `${currency}${cents * 0.01}`;
  });
  ```

  @static
  @param {Function} helper The helper function
  @method helper
  @for @ember/component/helper
  @public
  @since 1.13.0
*/
export function helper(helperFn: HelperFunction): HelperFactory<SimpleHelper> {
  return new Wrapper(helperFn);
}

export default Helper as HelperFactory<HelperInstance>;
