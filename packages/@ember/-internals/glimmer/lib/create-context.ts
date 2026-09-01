/**
 * @module @ember/helper
 */
import { precompileTemplate } from '@ember/template-compilation';
import {
  lookupRenderContext,
  lookupRenderContextFor,
  provideRenderContext,
} from '@glimmer/runtime/lib/render-scope';
import { valueForRef } from '@glimmer/reference/lib/reference';
import InternalComponent, {
  type OpaqueInternalComponentConstructor,
  opaquify,
} from './components/internal';

/**
 * The shape returned by `createContext`. Use `Provide` in templates to bind a
 * value into the render tree, read `value` to get the nearest enclosing
 * provided value, or call `consume(this)` to read it from a component
 * instance's position in the render tree (e.g. in an event handler).
 */
export interface Context<T> {
  Provide: OpaqueInternalComponentConstructor;
  get value(): T;
  consume(consumer?: object): T;
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
 * The returned object also has a `consume()` method. With no argument it
 * behaves exactly like reading `value`. Passed a component instance, it
 * resolves the context from that component's position in the render tree
 * instead -- the way to read a context from event handlers and other code
 * that runs outside of rendering:
 *
 * ```gjs
 * import Component from '@glimmer/component';
 * import { createContext } from '@ember/helper';
 * import { on } from '@ember/modifier';
 *
 * const theme = createContext<Theme>();
 *
 * class ThemedButton extends Component {
 *   onClick = () => {
 *     // Outside of rendering, `theme.value` would throw -- but passing the
 *     // component instance resolves the nearest <theme.Provide> above it.
 *     console.log(theme.consume(this).color);
 *   };
 *
 *   <template>
 *     <button {{on 'click' this.onClick}}>{{yield}}</button>
 *   </template>
 * }
 * ```
 *
 * Any rendered component instance works with every context -- the instance
 * identifies a position in the render tree, not any one context's value.
 * Resolution happens at `consume` time, so the value read is the provider's
 * current `@value`, not a snapshot from render time.
 *
 * @method createContext
 * @static
 * @for @ember/helper
 * @returns {Object} An object with `Provide` (a component that takes a
 *   `@value`), `value` (a getter that reads the nearest provided value), and
 *   `consume` (reads ambiently like `value`, or from a component instance's
 *   position).
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

  // The ambient read backing both the `value` getter and a no-argument
  // `consume()` call: resolve the nearest provider at the currently-rendering
  // position.
  function resolveAmbient(): T {
    let read = lookupRenderContext(key);
    if (read === undefined) {
      throw new Error(
        'A context `value` was read outside of rendering. The render-tree scope is only available during rendering -- there is nothing to read. To read a context from an event handler or other async callback, pass the component instance: `context.consume(this)`.'
      );
    }
    if (read === null) {
      throw new Error(
        'No matching `<Provide>` was found in the render tree. Wrap consumers in `<Context.Provide @value={{...}}>...</Context.Provide>`, or provide a default at the application root.'
      );
    }
    return read() as T;
  }

  return {
    Provide: opaquify(Provide, PROVIDE_TEMPLATE),

    get value(): T {
      return resolveAmbient();
    },

    consume(consumer?: object): T {
      if (consumer === undefined) {
        return resolveAmbient();
      }

      let read = lookupRenderContextFor(consumer, key);
      if (read === undefined) {
        throw new Error(
          '`consume(component)` expects a component instance that has been rendered -- the instance is how the context finds its position in the render tree. Pass the component itself (usually `this`), not another object, and only after the component has rendered.'
        );
      }
      if (read === null) {
        throw new Error(
          'No matching `<Provide>` was found above the component passed to `consume`. Wrap the component in `<Context.Provide @value={{...}}>...</Context.Provide>`, or provide a default at the application root.'
        );
      }
      return read() as T;
    },
  };
}

// All Provide components share the same template: yield to the block.
// Per-instance behavior is parameterized via the closure in createContext.
const PROVIDE_TEMPLATE = precompileTemplate('{{yield}}');
