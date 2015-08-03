/**
@module ember
@submodule ember-templates
*/

import Object from 'ember-runtime/system/object';

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

  As instances, these helpers also have access to the container an will accept
  injected dependencies.

  Additionally, class helpers can call `recompute` to force a new computation.

  @class Ember.Helper
  @public
*/
var Helper = Object.extend({
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
  */
});

Helper.reopenClass({
  isHelperFactory: true
});

/**
  In many cases, the ceremony of a full `Ember.Helper` class is not required.
  The `helper` method create pure-function helpers without instances. For
  example:

  ```js
  // app/helpers/format-currency.js
  export default Ember.Helper.helper(function(params, hash) {
    let cents = params[0];
    let currency = hash.currency;
    return `${currency}${cents * 0.01}`;
  });
  ```

  @static
  @param {Function} helper The helper function
  @method helper
  @public
*/
export function helper(helperFn) {
  return {
    isHelperInstance: true,
    compute: helperFn
  };
}

export default Helper;
