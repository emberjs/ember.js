/**
@module @ember/component
*/

import type { InternalFactoryManager } from '@ember/-internals/container/lib/container';
import type { InternalFactory, InternalOwner } from '@ember/-internals/owner';
import { setOwner } from '@ember/-internals/owner';
import { FrameworkObject } from '@ember/object/-internals';
import { getDebugName } from '@ember/-internals/utils';
import { assert } from '@ember/-debug-basic';
import { join } from '@ember/runloop';
import type { Arguments, Dict, HelperManager } from '@glimmer/interfaces';
import { getInternalHelperManager, helperCapabilities, setHelperManager } from '@glimmer/manager';
import type { DirtyableTag } from '@glimmer/validator';
import { consumeTag, createTag, dirtyTag } from '@glimmer/validator';

export const RECOMPUTE_TAG = Symbol('RECOMPUTE_TAG');

export type HelperFunction<T, P extends unknown[], N extends Dict<unknown>> = (
  positional: P,
  named: N
) => T;

export type SimpleHelperFactory<T, P extends unknown[], N extends Dict<unknown>> = InternalFactory<
  SimpleHelper<T, P, N>,
  HelperFactory<SimpleHelper<T, P, N>>
>;
export type ClassHelperFactory = InternalFactory<HelperInstance, HelperFactory<HelperInstance>>;

export interface HelperFactory<T> {
  isHelperFactory: true;
  create(): T;
}

export interface HelperInstance<T = unknown> {
  compute(positional: unknown[], named: Dict<unknown>): T;
  destroy(): void;
  [RECOMPUTE_TAG]: DirtyableTag;
}

const IS_CLASSIC_HELPER: unique symbol = Symbol('IS_CLASSIC_HELPER');

export interface SimpleHelper<T, P extends unknown[], N extends Dict<unknown>> {
  compute: HelperFunction<T, P, N>;
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
export function helper<T, P extends unknown[], N extends Dict<unknown>>(
  helperFn: HelperFunction<T, P, N>
): HelperFactory<SimpleHelper<T, P, N>> {
  return new Wrapper(helperFn);
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

  // `packages/ember/index.js` was setting `Helper.helper`. This seems like
  // a bad idea and probably not something we want. We've moved that definition
  // here, but it should definitely be reviewed and probably removed.
  /** @deprecated */
  static helper = helper;

  // SAFETY: this is initialized in `init`, rather than `constructor`. It is
  // safe to `declare` like this *if and only if* nothing uses the constructor
  // directly in this class, since nothing else can run before `init`.
  declare [RECOMPUTE_TAG]: DirtyableTag;

  init(properties: object | undefined) {
    super.init(properties);
    this[RECOMPUTE_TAG] = createTag();

    assert('expected compute to be defined', this.compute);
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
  return (obj as any)[IS_CLASSIC_HELPER] === true;
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

  constructor(owner: InternalOwner | undefined) {
    let ownerInjection = {};
    setOwner(ownerInjection, owner!);
    this.ownerInjection = ownerInjection;
  }

  createHelper(
    definition: typeof Helper | InternalFactoryManager<object>,
    args: Arguments
  ): ClassicHelperStateBucket {
    let instance = isFactoryManager(definition)
      ? definition.create()
      : definition.create(this.ownerInjection);

    assert(
      'expected HelperInstance',
      (function (instance: unknown): instance is HelperInstance {
        if (instance !== null && typeof instance === 'object') {
          let cast = instance as HelperInstance;
          return typeof cast.compute === 'function' && typeof cast.destroy === 'function';
        }
        return false;
      })(instance)
    );

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
    return getDebugName!(((definition.class || definition)! as any)['prototype']);
  }
}

function isFactoryManager(obj: unknown): obj is InternalFactoryManager<object> {
  return obj != null && 'class' in (obj as InternalFactoryManager<object>);
}

setHelperManager((owner: InternalOwner | undefined): ClassicHelperManager => {
  return new ClassicHelperManager(owner);
}, Helper);

export const CLASSIC_HELPER_MANAGER = getInternalHelperManager(Helper);

///////////

class Wrapper<T = unknown, P extends unknown[] = unknown[], N extends Dict<unknown> = Dict<unknown>>
  implements HelperFactory<SimpleHelper<T, P, N>>
{
  readonly isHelperFactory = true;

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

export default Helper;
