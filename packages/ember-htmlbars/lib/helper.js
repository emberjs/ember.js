/**
@module ember
@submodule ember-templates
*/

import EmberObject from 'ember-runtime/system/object';

/**
  Ember Helpers are functions that can compute values, and are used in templates.
  For example, this code calls a helper named `format-currency`:

  ```handlebars
  <div>{{format-currency cents currency="$"}}</div>
  ```

  Additionally, a helper can be called as a nested helper (sometimes called a
  subexpression). In this example, the computed value of a helper is passed
  to a component named `show-money`:

  ```handlebars
  {{show-money amount=(format-currency cents currency="$")}}
  ```

  Helpers defined using a class must provide a `compute` function. For example:

  ```js
  export default Ember.Helper.extend({
    compute(params, hash) {
      let cents = params[0];
      let currency = hash.currency;
      return `${currency}${cents * 0.01}`;
    }
  });
  ```

  Each time the input to a helper changes, the `compute` function will be
  called again.

  As instances, these helpers also have access to the container and will accept
  injected dependencies.

  Additionally, class helpers can call `recompute` to force a new computation.

  If the output of your helper is only dependent on the current input, then you
  can use the `Helper.helper` function.
  See [Ember.Helper.helper](/api/classes/Ember.Helper.html#method_helper).

  In this form the example above becomes:

  ```js
  export default Ember.Helper.helper((params, hash) => {
    let cents = params[0];
    let currency = hash.currency;
    return `${currency}${cents * 0.01}`;
  });
  ```


  @class Ember.Helper
  @public
  @since 1.13.0
*/
const Helper = EmberObject.extend({
  isHelperInstance: true,

  /**
    On a class-based helper, it may be useful to force a recomputation of that
    helpers value. This is akin to `rerender` on a component.

    For example, this component will rerender when the `currentUser` on a
    session service changes:

    ```js
    // app/helpers/current-user-email.js
    export default Ember.Helper.extend({
      session: Ember.inject.service(),
      onNewUser: Ember.observer('session.currentUser', function() {
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
    this._stream.notify();
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
  In many cases, the ceremony of a full `Ember.Helper` class is not required.
  The `helper` method creates pure-function helpers without instances. For
  example:

  ```js
  // app/helpers/format-currency.js
  export function formatCurrency([cents], hash) {
    let currency = hash.currency;
    return `${currency}${cents * 0.01}`;
  });

  export default Ember.Helper.helper(formatCurrency);

  // tests/myhelper.js
  import { formatCurrency } from ..../helpers/myhelper
  // add some tests
  ```

  This form is more efficient at run time and results in smaller compiled js.
  It is also easier to test by using the following structure and importing the
  `formatCurrency` function into a test.

  @static
  @param {Function} helper The helper function
  @method helper
  @public
  @since 1.13.0
*/
export function helper(compute) {
  return {
    isHelperInstance: true,
    compute
  };
}

export default Helper;
