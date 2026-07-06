/**
 * @module @ember/helper
 */
import { precompileTemplate } from '@ember/template-compilation';
import {
  captureRenderScope,
  lookupCapturedRenderContext,
  lookupRenderContext,
  provideRenderContext,
} from '@glimmer/runtime/lib/render-scope';
import { valueForRef } from '@glimmer/reference/lib/reference';
import InternalComponent, {
  type OpaqueInternalComponentConstructor,
  opaquify,
} from './components/internal';

declare const CAPTURED_CONTEXT: unique symbol;

/**
 * An opaque handle to a position in the render tree, returned by
 * `captureContext()`. Pass it to a context's `consume(captured)` to resolve
 * that context from the captured position later -- e.g. inside an event
 * handler, after the render stack has unwound and ambient reads like `value`
 * would throw.
 */
export interface CapturedContext {
  // A type-only brand so arbitrary objects don't typecheck as a capture. The
  // only way to obtain one is `captureContext()`; at runtime validity is
  // checked against the render-scope layer's WeakMap, not this symbol.
  readonly [CAPTURED_CONTEXT]: never;
}

/**
 * The shape returned by `createContext`. Use `Provide` in templates to bind a
 * value into the render tree, read `value` to get the nearest enclosing
 * provided value, or call `consume(captured)` to read it from a previously
 * captured render-tree position (e.g. in an event handler).
 */
export interface Context<T> {
  Provide: OpaqueInternalComponentConstructor;
  get value(): T;
  consume(captured?: CapturedContext): T;
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
 * behaves exactly like reading `value`. Passed a handle from
 * `captureContext()`, it resolves the context from that captured
 * render-tree position instead -- the way to read a context from event
 * handlers and other code that runs outside of rendering (see
 * `captureContext`).
 *
 * @method createContext
 * @static
 * @for @ember/helper
 * @returns {Object} An object with `Provide` (a component that takes a
 *   `@value`), `value` (a getter that reads the nearest provided value), and
 *   `consume` (reads ambiently like `value`, or from a captured position).
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
        'A context `value` was read outside of rendering. The render-tree scope is only available during rendering -- there is nothing to read. To read a context from an event handler or other async callback, capture a handle during rendering with `captureContext()` and pass it to `consume(captured)`.'
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

    consume(captured?: CapturedContext): T {
      if (captured === undefined) {
        return resolveAmbient();
      }

      let read = lookupCapturedRenderContext(captured, key);
      if (read === undefined) {
        throw new Error(
          '`consume(captured)` expects the handle returned from `captureContext()`, but received some other value.'
        );
      }
      if (read === null) {
        throw new Error(
          'No matching `<Provide>` was found above the captured render-tree position. Wrap the component that called `captureContext()` in `<Context.Provide @value={{...}}>...</Context.Provide>`, or provide a default at the application root.'
        );
      }
      return read() as T;
    },
  };
}

/**
 * Captures the current render-tree position as an opaque handle that can be
 * passed to a context's `consume(captured)` later.
 *
 * The ambient reads -- `context.value` or `context.consume()` -- only work
 * while rendering, because they resolve against the currently-rendering
 * node. Event handlers, timers, and other async callbacks run after the
 * render stack has unwound, so they have no ambient position to read from.
 * `captureContext()` bridges that gap: call it while rendering (a component
 * constructor or a field initializer is the natural spot), keep the handle,
 * and resolve any context from that position later.
 *
 * @example
 *
 * ```gjs
 * import Component from '@glimmer/component';
 * import { createContext, captureContext } from '@ember/helper';
 * import { on } from '@ember/modifier';
 *
 * const theme = createContext<Theme>();
 *
 * class ThemedButton extends Component {
 *   // Field initializers run in the constructor, during rendering, so this
 *   // captures the position of <ThemedButton/> in the render tree.
 *   context = captureContext();
 *
 *   onClick = () => {
 *     // Outside of rendering, `theme.value` would throw -- but the captured
 *     // handle still resolves the nearest <theme.Provide> above this
 *     // component.
 *     console.log(theme.consume(this.context).color);
 *   };
 *
 *   <template>
 *     <button {{on 'click' this.onClick}}>{{yield}}</button>
 *   </template>
 * }
 * ```
 *
 * A single captured handle works with every context -- it captures the
 * render-tree position, not any one context's value. Resolution happens at
 * `consume` time, so the value read is the provider's current `@value`, not
 * a snapshot from when the handle was captured.
 *
 * `captureContext()` throws if called outside of rendering -- there is no
 * position to capture.
 *
 * @method captureContext
 * @static
 * @for @ember/helper
 * @returns {Object} An opaque handle for `consume(captured)`.
 * @public
 */
export function captureContext(): CapturedContext {
  let handle = captureRenderScope();
  if (handle === undefined) {
    throw new Error(
      '`captureContext()` was called outside of rendering -- there is no render-tree position to capture. Capture while rendering (e.g. in a component constructor or field initializer) and pass the handle to `consume(captured)` later.'
    );
  }
  return handle as CapturedContext;
}

// All Provide components share the same template: yield to the block.
// Per-instance behavior is parameterized via the closure in createContext.
const PROVIDE_TEMPLATE = precompileTemplate('{{yield}}');
