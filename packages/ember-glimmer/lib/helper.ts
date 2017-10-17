/**
@module @ember/component
*/

import { symbol } from 'ember-utils';
import { FrameworkObject } from 'ember-runtime';
import { DirtyableTag } from '@glimmer/reference';

export const RECOMPUTE_TAG = symbol('RECOMPUTE_TAG');

/**
  Ember Helpers are functions that can compute values, and are used in templates.
  For example, this code calls a helper named `format-currency`:

  ```handlebars
  <div>{{format-currency cents currency="$"}}</div>
  ```

  Additionally a helper can be called as a nested helper (sometimes called a
  subexpression). In this example, the computed value of a helper is passed
  to a component named `show-money`:

  ```handlebars
  {{show-money amount=(format-currency cents currency="$")}}
  ```

  Helpers defined using a class must provide a `compute` function. For example:

  ```app/helpers/format-currency.js
  import Helper from '@ember/component/helper';

  export default Helper.extend({
    compute(params, hash) {
      let cents = params[0];
      let currency = hash.currency;
      return `${currency}${cents * 0.01}`;
    }
  });
  ```

  Each time the input to a helper changes, the `compute` function will be
  called again.

  As instances, these helpers also have access to the container an will accept
  injected dependencies.

  Additionally, class helpers can call `recompute` to force a new computation.

  @class Helper
  @public
  @since 1.13.0
*/
var Helper = FrameworkObject.extend({
  isHelperInstance: true,

  init() {
    this._super(...arguments);
    this[RECOMPUTE_TAG] = new DirtyableTag();
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
    this[RECOMPUTE_TAG].dirty();
  }

  /**
    Override this function when writing a class-based helper.

    @method compute
    @param {Array} params The positional arguments to the helper
    @param {Object} hash The named arguments to the helper
    @public
    @since 1.13.0
  */
});

Helper.reopenClass({
  isHelperFactory: true
});

/**
  In many cases, the ceremony of a full `Helper` class is not required.
  The `helper` method create pure-function helpers without instances. For
  example:

  ```app/helpers/format-currency.js
  import { helper } from '@ember/component/helper';

  export default helper(function(params, hash) {
    let cents = params[0];
    let currency = hash.currency;
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
export function helper(helperFn) {
  return {
    isHelperInstance: true,
    compute: helperFn
  };
}

export default Helper;
