/**
@module @ember/component
*/

import { FactoryManager } from '@ember/-internals/container/lib/container';
import { Factory, Owner, setOwner } from '@ember/-internals/owner';
import { FrameworkObject } from '@ember/-internals/runtime';
import { getDebugName, symbol } from '@ember/-internals/utils';
import { join } from '@ember/runloop';
import { Arguments, Dict, HelperManager } from '@glimmer/interfaces';
import { getInternalHelperManager, helperCapabilities, setHelperManager } from '@glimmer/manager';
import { consumeTag, createTag, dirtyTag } from '@glimmer/validator';

export const RECOMPUTE_TAG = symbol('RECOMPUTE_TAG');

export type HelperFunction<T, P extends unknown[], N extends Dict<unknown>> = (
  positional: P,
  named: N
) => T;

export type SimpleHelperFactory<T, P extends unknown[], N extends Dict<unknown>> = Factory<
  SimpleHelper<T, P, N>,
  HelperFactory<SimpleHelper<T, P, N>>
>;
export type ClassHelperFactory = Factory<HelperInstance, HelperFactory<HelperInstance>>;

export interface HelperFactory<T> {
  isHelperFactory: true;
  create(): T;
}

export interface HelperInstance<T = unknown> {
  compute(positional: unknown[], named: Dict<unknown>): T;
  destroy(): void;
}

const IS_CLASSIC_HELPER: unique symbol = Symbol('IS_CLASSIC_HELPER');

export interface SimpleHelper<T, P extends unknown[], N extends Dict<unknown>> {
  compute: HelperFunction<T, P, N>;
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
  @extends CoreObject
  @public
  @since 1.13.0
*/
interface Helper {
  /**
    Override this function when writing a class-based helper.

    @method compute
    @param {Array} params The positional arguments to the helper
    @param {Object} hash The named arguments to the helper
    @public
    @since 1.13.0
  */
  compute(params: unknown[], hash: Dict<unknown>): unknown;
}
class Helper extends FrameworkObject {
  static isHelperFactory = true;
  static [IS_CLASSIC_HELPER] = true;

  init() {
    super.init();
    this[RECOMPUTE_TAG] = createTag();
  }

  /**
    On a class-based helper, it may be useful to force a recomputation of that
    helpers value. This is akin to `rerender` on a component.

    For example, this component will rerender when the `currentUser` on a
    session service changes:

    ```app/helpers/current-user-email.js
    import Helper from '@ember/component/helper'
    import { service } from '@ember/service'
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
    join(() => dirtyTag(this[RECOMPUTE_TAG]));
  }
}

export function isClassicHelper(obj: object): boolean {
  return obj[IS_CLASSIC_HELPER] === true;
}

interface ClassicHelperStateBucket {
  instance: HelperInstance;
  args: Arguments;
}

class ClassicHelperManager implements HelperManager<ClassicHelperStateBucket> {
  capabilities = helperCapabilities('3.23', {
    hasValue: true,
    hasDestroyable: true,
  });

  private ownerInjection: object;

  constructor(owner: Owner | undefined) {
    let ownerInjection = {};
    setOwner(ownerInjection, owner!);
    this.ownerInjection = ownerInjection;
  }

  createHelper<T, C>(definition: typeof Helper | FactoryManager<T, C>, args: Arguments) {
    let instance = isFactoryManager<T, C>(definition)
      ? definition.create()
      : definition.create(this.ownerInjection);

    return {
      instance,
      args,
    };
  }

  getDestroyable({ instance }: ClassicHelperStateBucket) {
    return instance;
  }

  getValue({ instance, args }: ClassicHelperStateBucket) {
    let { positional, named } = args;

    let ret = instance.compute(positional as unknown[], named);

    consumeTag(instance[RECOMPUTE_TAG]);

    return ret;
  }

  getDebugName(definition: ClassHelperFactory) {
    return getDebugName!((definition.class || definition)!['prototype']);
  }
}

function isFactoryManager<T, C>(obj: unknown): obj is FactoryManager<T, C> {
  return obj != null && 'class' in (obj as FactoryManager<T, C>);
}

setHelperManager((owner: Owner | undefined): ClassicHelperManager => {
  return new ClassicHelperManager(owner);
}, Helper);

export const CLASSIC_HELPER_MANAGER = getInternalHelperManager(Helper);

///////////

class Wrapper<T = unknown, P extends unknown[] = unknown[], N extends Dict<unknown> = Dict<unknown>>
  implements HelperFactory<SimpleHelper<T, P, N>> {
  isHelperFactory: true = true;

  constructor(public compute: HelperFunction<T, P, N>) {}

  create() {
    // needs new instance or will leak containers
    return {
      compute: this.compute,
    };
  }
}

class SimpleClassicHelperManager implements HelperManager<() => unknown> {
  capabilities = helperCapabilities('3.23', {
    hasValue: true,
  });

  createHelper(definition: Wrapper, args: Arguments) {
    let { compute } = definition;

    return () => compute.call(null, args.positional as unknown[], args.named);
  }

  getValue(fn: () => unknown) {
    return fn();
  }

  getDebugName(definition: Wrapper) {
    return getDebugName!(definition.compute);
  }
}

export const SIMPLE_CLASSIC_HELPER_MANAGER = new SimpleClassicHelperManager();

setHelperManager(() => SIMPLE_CLASSIC_HELPER_MANAGER, Wrapper.prototype);

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
export function helper<T, P extends unknown[], N extends Dict<unknown>>(
  helperFn: HelperFunction<T, P, N>
): HelperFactory<SimpleHelper<T, P, N>> {
  return new Wrapper(helperFn);
}

export default Helper;
