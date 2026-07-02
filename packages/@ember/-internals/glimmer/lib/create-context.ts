/**
 * @module @ember/helper
 */
import { precompileTemplate } from '@ember/template-compilation';
import { lookupRenderContext, provideRenderContext } from '@glimmer/runtime/lib/render-scope';
import { valueForRef } from '@glimmer/reference/lib/reference';
import InternalComponent, {
  type OpaqueInternalComponentConstructor,
  opaquify,
} from './components/internal';

/**
 * The shape returned by `createContext`. Use `Provide` in templates to bind a
 * value into the render tree and read `value` to get the nearest enclosing
 * provided value.
 */
export interface Context<T> {
  Provide: OpaqueInternalComponentConstructor;
  get value(): T;
}

/**
 * Creates a render-tree-scoped context per [RFC #1200][rfc].
 *
 * [rfc]: https://github.com/emberjs/rfcs/pull/1200
 *
 * `createContext` takes no value of its own -- it only establishes the
 * *type* of the value (via a type parameter) and returns a `Provide`
 * component plus a `value` getter. The value is supplied at render time
 * through `<Provide @value={{...}}>`.
 *
 * @example
 *
 * ```gjs
 * import { createContext } from '@ember/helper';
 *
 * class Theme {
 *   color = 'dark';
 * }
 *
 * const theme = createContext<Theme>();
 *
 * <template>
 *   <theme.Provide @value={{this.theme}}>
 *     {{theme.value.color}} {{! whatever this.theme.color is }}
 *   </theme.Provide>
 *
 *   {{! Override the value at a nested provider: }}
 *   <theme.Provide @value={{this.theme}}>
 *     <theme.Provide @value={{this.lightTheme}}>
 *       {{#let theme.value as |t|}}
 *         {{t.color}} {{! the light theme's color }}
 *       {{/let}}
 *     </theme.Provide>
 *   </theme.Provide>
 *
 *   {{theme.value}} {{! throws -- no provider in the hierarchy }}
 * </template>
 * ```
 *
 * Reactivity: the `@value` binding is reactive. When the argument passed to
 * `<Provide>` updates, consumers re-render automatically. If `@value` is a
 * stable object, mutating its `@tracked` fields likewise re-renders
 * consumers.
 *
 * `value` throws if it is read outside of rendering, or if no matching
 * `<Provide>` exists higher in the render tree. This is intentional
 * harm-reduction: a missing provider is almost always a bug, not a
 * legitimate "fall back to undefined" state. If you want a default, provide
 * one at the application root.
 *
 * @method createContext
 * @static
 * @for @ember/helper
 * @returns {Object} An object with `Provide` (a component that takes a
 *   `@value`) and `value` (a getter that reads the nearest provided value).
 * @public
 */
export function createContext<T>(): Context<T> {
  // This context's identity token: unique to this `createContext()` call and
  // stable, so the matching `<Provide>` and `value` reads find each other on
  // a shared render-scope node without colliding with other contexts. Held in
  // the closure -- not exported.
  const key = {};

  class Provide extends InternalComponent {
    static override toString(): string {
      return 'Provide';
    }

    constructor(...args: ConstructorParameters<typeof InternalComponent>) {
      super(...args);

      // The provided value comes from `@value`. Store a lazy read that pulls
      // the current value from the argument reference. `valueForRef` consumes
      // tracking tags when called inside a tracking frame, so consumers
      // re-render automatically when the argument updates. If `@value` was
      // omitted, the provider still exists in the tree and provides
      // `undefined` (`value` is undefined rather than throwing).
      const valueRef = this.args.named['value'];
      const read = (): unknown => (valueRef === undefined ? undefined : valueForRef(valueRef));

      provideRenderContext(key, read);
    }
  }

  return {
    Provide: opaquify(Provide, PROVIDE_TEMPLATE),

    get value(): T {
      let read = lookupRenderContext(key);
      if (read === undefined) {
        throw new Error(
          'A context `value` was read outside of rendering. The render-tree scope is only available during rendering -- there is nothing to read.'
        );
      }
      if (read === null) {
        throw new Error(
          'No matching `<Provide>` was found in the render tree. Wrap consumers in `<Context.Provide @value={{...}}>...</Context.Provide>`, or provide a default at the application root.'
        );
      }
      return read() as T;
    },
  };
}

// All Provide components share the same template: yield to the block.
// Per-instance behavior is parameterized via the closure in createContext.
const PROVIDE_TEMPLATE = precompileTemplate('{{yield}}');
