declare module '@ember/-internals/glimmer/lib/helper' {
  /**
    @module @ember/component
    */
  import { FrameworkObject } from '@ember/object/-internals';
  import type { Arguments, HelperManager } from '@glimmer/interfaces';
  import type { DirtyableTag } from '@glimmer/validator';
  export const RECOMPUTE_TAG: unique symbol;
  type GetOr<T, K, Else> = K extends keyof T ? T[K] : Else;
  type Args<S> = GetOr<S, 'Args', {}>;
  type DefaultPositional = unknown[];
  type Positional<S> = GetOr<Args<S>, 'Positional', DefaultPositional>;
  type Named<S> = GetOr<Args<S>, 'Named', object>;
  type Return<S> = GetOr<S, 'Return', unknown>;
  export interface HelperFactory<T> {
    isHelperFactory: true;
    create(): T;
  }
  export interface HelperInstance<S> {
    compute(positional: Positional<S>, named: Named<S>): Return<S>;
    destroy(): void;
    [RECOMPUTE_TAG]: DirtyableTag;
  }
  const IS_CLASSIC_HELPER: unique symbol;
  export interface SimpleHelper<S> {
    compute: (positional: Positional<S>, named: Named<S>) => Return<S>;
  }
  const SIGNATURE: unique symbol;
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
    static isHelperFactory: boolean;
    static [IS_CLASSIC_HELPER]: boolean;
    /** @deprecated */
    static helper: typeof helper;
    [RECOMPUTE_TAG]: DirtyableTag;
    private [SIGNATURE];
    init(properties: object | undefined): void;
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
    recompute(): void;
  }
  export function isClassicHelper(obj: object): boolean;
  export const CLASSIC_HELPER_MANAGER:
    | import('@glimmer/interfaces').Helper<object>
    | import('@glimmer/manager').CustomHelperManager<object>;
  class Wrapper<S = unknown> implements HelperFactory<SimpleHelper<S>> {
    compute: (positional: Positional<S>, named: Named<S>) => Return<S>;
    readonly isHelperFactory = true;
    constructor(compute: (positional: Positional<S>, named: Named<S>) => Return<S>);
    create(): SimpleHelper<S>;
  }
  class SimpleClassicHelperManager implements HelperManager<() => unknown> {
    capabilities: import('@glimmer/interfaces').HelperCapabilities;
    createHelper(definition: Wrapper, args: Arguments): () => unknown;
    getValue(fn: () => unknown): unknown;
    getDebugName(definition: Wrapper): string;
  }
  export const SIMPLE_CLASSIC_HELPER_MANAGER: SimpleClassicHelperManager;
  /**
   * The type of a function-based helper.
   *
   * @note This is *not* user-constructible: it is exported only so that the type
   *   returned by the `helper` function can be named (and indeed can be exported
   *   like `export default helper(...)` safely).
   */
  export type FunctionBasedHelper<S> = abstract new () => FunctionBasedHelperInstance<S>;
  export abstract class FunctionBasedHelperInstance<S> extends Helper<S> {
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
  export function helper<P extends DefaultPositional, N extends object, R = unknown>(
    helperFn: (positional: P, named: N) => R
  ): FunctionBasedHelper<{
    Args: {
      Positional: P;
      Named: N;
    };
    Return: R;
  }>;
  export function helper<S>(
    helperFn: (positional: Positional<S>, named: Named<S>) => Return<S>
  ): FunctionBasedHelper<S>;
  export {};
}
