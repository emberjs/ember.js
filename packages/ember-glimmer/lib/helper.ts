/**
@module @ember/component
*/

import { Dict, Opaque } from '@glimmer/interfaces';
import { DirtyableTag } from '@glimmer/reference';
import { FrameworkObject } from 'ember-runtime';
import { Factory, symbol } from 'ember-utils';

export const RECOMPUTE_TAG = symbol('RECOMPUTE_TAG');

export type HelperFunction = (positional: Opaque[], named: Dict<Opaque>) => Opaque;

export type SimpleHelperFactory = Factory<SimpleHelper, SimpleHelper>;
export type ClassHelperFactory = Factory<HelperInstance, HelperStatic>;

export type HelperFactory = SimpleHelperFactory | ClassHelperFactory;

export interface SimpleHelper {
  isHelperFactory: true;
  isSimpleHelper: true;

  create(): SimpleHelper;
  compute: HelperFunction;
}

export interface HelperStatic {
  isHelperFactory: true;
  isSimpleHelper: false;

  create(): HelperInstance;
}

export interface HelperInstance {
  compute: HelperFunction;
  destroy(): void;
}

export function isHelperFactory(helper: any | undefined | null): helper is HelperFactory {
  return typeof helper === 'object' &&
         helper !== null &&
         helper.class && helper.class.isHelperFactory;
}

export function isSimpleHelper(helper: HelperFactory): helper is SimpleHelperFactory {
  return helper.class.isSimpleHelper;
}

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
let Helper = FrameworkObject.extend({
  init() {
    this._super(...arguments);
    this[RECOMPUTE_TAG] = DirtyableTag.create();
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
    this[RECOMPUTE_TAG].inner.dirty();
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

Helper.reopenClass({
  isHelperFactory: true,
  isSimpleHelper: false,
});

class Wrapper implements SimpleHelper {
  isHelperFactory: true = true;
  isSimpleHelper: true = true;

  constructor(public compute: HelperFunction) {}

  create() {
    return this;
  }
}

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
export function helper(helperFn: HelperFunction): SimpleHelper {
  return new Wrapper(helperFn);
}

export default Helper as HelperStatic;
