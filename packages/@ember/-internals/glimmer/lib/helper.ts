/**
@module @ember/component
*/

import type { InternalFactoryManager } from '@ember/-internals/container/lib/container';
import type { InternalFactory, InternalOwner } from '@ember/-internals/owner';
import { setOwner } from '@ember/-internals/owner';
import { FrameworkObject } from '@ember/object/-internals';
import { getDebugName } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { join } from '@ember/runloop';
import type { Arguments, HelperManager } from '@glimmer/interfaces';
import { getInternalHelperManager, helperCapabilities, setHelperManager } from '@glimmer/manager';
import type { DirtyableTag } from '@glimmer/validator';
import { consumeTag, createTag, dirtyTag } from '@glimmer/validator';

export const RECOMPUTE_TAG = Symbol('RECOMPUTE_TAG');

// Signature type utilities
type GetOr<T, K, Else> = K extends keyof T ? T[K] : Else;

type Args<S> = GetOr<S, 'Args', {}>;

type DefaultPositional = unknown[];
type Positional<S> = GetOr<Args<S>, 'Positional', DefaultPositional>;

type Named<S> = GetOr<Args<S>, 'Named', object>;

type Return<S> = GetOr<S, 'Return', unknown>;

// Implements Ember's `Factory` interface and tags it for narrowing/checking.
export interface HelperFactory<T> {
  isHelperFactory: true;
  create(): T;
}

export interface HelperInstance<S> {
  compute(positional: Positional<S>, named: Named<S>): Return<S>;
  destroy(): void;
  [RECOMPUTE_TAG]: DirtyableTag;
}

const IS_CLASSIC_HELPER: unique symbol = Symbol('IS_CLASSIC_HELPER');

export interface SimpleHelper<S> {
  compute: (positional: Positional<S>, named: Named<S>) => Return<S>;
}

// A zero-runtime-overhead private symbol to use in branding the component to
// preserve its type parameter.
declare const SIGNATURE: unique symbol;

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
// ESLint doesn't understand declaration merging.
/* eslint-disable import/export */
export default interface Helper<S = unknown> {
  /**
    Override this function when writing a class-based helper.

    @method compute
    @param {Array} positional The positional arguments to the helper
    @param {Object} named The named arguments to the helper
    @public
    @since 1.13.0
  */
  compute(positional: Positional<S>, named: Named<S>): Return<S>;
}
export default class Helper<S = unknown> extends FrameworkObject {
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

  // SAFETY: this has no runtime existence whatsoever; it is a "phantom type"
  // here to preserve the type param.
  private declare [SIGNATURE]: S;

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
/* eslint-enable import/export */

export function isClassicHelper(obj: object): boolean {
  return (obj as any)[IS_CLASSIC_HELPER] === true;
}

interface ClassicHelperStateBucket {
  instance: HelperInstance<unknown>;
  args: Arguments;
}

type ClassHelperFactory = InternalFactory<
  HelperInstance<unknown>,
  HelperFactory<HelperInstance<unknown>>
>;

class ClassicHelperManager implements HelperManager<ClassicHelperStateBucket> {
  capabilities = helperCapabilities('3.23', {
    hasValue: true,
    hasDestroyable: true,
  });

  private ownerInjection: Record<string, unknown>;

  constructor(owner: InternalOwner | undefined) {
    let ownerInjection: Record<string, unknown> = {};
    setOwner(ownerInjection, owner!);
    this.ownerInjection = ownerInjection;
  }

  createHelper(
    definition: typeof Helper | InternalFactoryManager<Helper>,
    args: Arguments
  ): ClassicHelperStateBucket {
    let instance = isFactoryManager(definition)
      ? definition.create()
      : definition.create(this.ownerInjection);

    assert(
      'expected HelperInstance',
      (function (instance: unknown): instance is HelperInstance<unknown> {
        if (instance !== null && typeof instance === 'object') {
          let cast = instance as HelperInstance<unknown>;
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

    let ret = instance.compute(positional as DefaultPositional, named);

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

class Wrapper<S = unknown> implements HelperFactory<SimpleHelper<S>> {
  readonly isHelperFactory = true;

  constructor(public compute: (positional: Positional<S>, named: Named<S>) => Return<S>) {}

  create(): SimpleHelper<S> {
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
    return () => definition.compute.call(null, args.positional as [], args.named);
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

/*
  Function-based helpers need to present with a constructor signature so that
  type parameters can be preserved when `helper()` is passed a generic function
  (this is particularly key for checking helper invocations with Glint).
  Accordingly, we define an abstract class and declaration merge it with the
  interface; this inherently provides an `abstract` constructor. Since it is
  `abstract`, it is not callable, which is important since end users should not
  be able to do `let myHelper = helper(someFn); new myHelper()`.
 */

/**
 * The type of a function-based helper.
 *
 * @note This is *not* user-constructible: it is exported only so that the type
 *   returned by the `helper` function can be named (and indeed can be exported
 *   like `export default helper(...)` safely).
 */
// Making `FunctionBasedHelper` an alias this way allows callers to name it in
// terms meaningful to *them*, while preserving the type behavior described on
// the `abstract class FunctionBasedHelperInstance` below.
export type FunctionBasedHelper<S> = abstract new () => FunctionBasedHelperInstance<S>;

// This abstract class -- specifically, its `protected abstract __concrete__`
// member -- prevents subclasses from doing `class X extends helper(..)`, since
// that is an error at runtime. While it is rare that people would type that, it
// is not impossible and we use this to give them early signal via the types for
// a behavior which will break (and in a somewhat inscrutable way!) at runtime.
//
// This is needful because we lie about what this actually is for Glint's sake:
// a function-based helper returns a `Factory<SimpleHelper>`, which is designed
// to be "opaque" from a consumer's POV, i.e. not user-callable or constructible
// but only useable in a template (or via `invokeHelper()` which also treats it
// as a fully opaque `object` from a type POV). But Glint needs a `Helper<S>` to
// make it work the same way as class-based helpers. (Note that this does not
// hold for plain functions as helpers, which it can handle distinctly.) This
// signature thus makes it so that the item is usable *as* a `Helper` in Glint,
// but without letting end users treat it as a helper class instance.
export declare abstract class FunctionBasedHelperInstance<S> extends Helper<S> {
  protected abstract __concrete__: never;
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
// This overload allows users to write types directly on the callback passed to
// the `helper` function and infer the resulting type correctly.
export function helper<P extends DefaultPositional, N extends object, R = unknown>(
  helperFn: (positional: P, named: N) => R
): FunctionBasedHelper<{
  Args: {
    Positional: P;
    Named: N;
  };
  Return: R;
}>;
// This overload allows users to provide a `Signature` type explicitly at the
// helper definition site, e.g. `helper<Sig>((pos, named) => {...})`. **Note:**
// this overload must appear second, since TS' inference engine will not
// correctly infer the type of `S` here from the types on the supplied callback.
export function helper<S>(
  helperFn: (positional: Positional<S>, named: Named<S>) => Return<S>
): FunctionBasedHelper<S>;
export function helper(
  helperFn: (positional: unknown[], named: object) => unknown
  // At the implementation site, we don't care about the actual underlying type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): FunctionBasedHelper<any> {
  // SAFETY: this is completely lies, in two ways:
  //
  // 1. `Wrapper` is a `Factory<SimpleHelper<S>>`, but from the perspective of
  //    any external callers (i.e. Ember *users*), it is quite important that
  //    the `Factory` relationship be hidden, because it is not public API for
  //    an end user to call `.create()` on a helper created this way. Instead,
  //    we provide them an `abstract new` signature (which means it cannot be
  //    directly constructed by calling `new` on it) and which does not have the
  //    `.create()` signature on it anymore.
  //
  // 2. The produced type here ends up being a subtype of `Helper`, which is not
  //    strictly true. This is necessary for the sake of Glint, which provides
  //    its information by way of a "declaration merge" with `Helper<S>` in the
  //    case of items produced by `helper()`.
  //
  // Long-term, this entire construct can go away in favor of deprecating the
  // `helper()` invocation in favor of using plain functions.
  return new Wrapper(helperFn) as unknown as FunctionBasedHelper<any>;
}
