/**
 * No-op shim for `@lifeart/gxt` used by Vite resolve.alias in classic mode
 * (when GXT_MODE !== 'true'). Every symbol imported by
 * @ember/-internals/glimmer/lib/* AND
 * @ember/-internals/gxt-backend/* is shimmed to either a no-op function or
 * a null-ish constant. The actual gxt runtime is only loaded when
 * GXT_MODE=true; in classic mode this stub keeps the imports resolvable
 * without pulling 35k LOC of glimmer-next runtime into the bundle.
 *
 * Why we also stub gxt-backend's imports: the classic-mode entrypoint
 * (index.html) loads `@ember/-internals/gxt-backend/ember-template-compiler`
 * which transitively imports compile.ts/manager.ts/etc. Those files are
 * gated at *runtime* by `__GXT_MODE__` so they never execute their gxt
 * code paths in classic mode, but their static imports still need to
 * resolve. Stubbing those imports prevents the gxt dist from being pulled
 * into the classic bundle while leaving the gxt-backend modules loadable.
 *
 * If you add a new symbol to the gxt API used by classic-mode code paths,
 * add a matching no-op here too.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Classes — must be `new`-able so `class Foo extends Component {}` works at
// module-evaluation time.
// ---------------------------------------------------------------------------
export class Component {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(..._args: any[]) {}
}
export class HTMLBrowserDOMApi {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(..._args: any[]) {}
}
export class Root {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(..._args: any[]) {}
}

// ---------------------------------------------------------------------------
// Symbol-like context tokens — used as object keys / WeakMap keys. Need to be
// unique values; classic mode never dereferences them.
// ---------------------------------------------------------------------------
export const RENDERING_CONTEXT: any = Symbol('gxt-stub-RENDERING_CONTEXT');
export const RENDERING_CONTEXT_PROPERTY: any = Symbol('gxt-stub-RENDERING_CONTEXT_PROPERTY');
export const RENDERED_NODES_PROPERTY: any = Symbol('gxt-stub-RENDERED_NODES_PROPERTY');
export const COMPONENT_ID_PROPERTY: any = Symbol('gxt-stub-COMPONENT_ID_PROPERTY');
export const ROOT_CONTEXT: any = Symbol('gxt-stub-ROOT_CONTEXT');
export const SUSPENSE_CONTEXT: any = Symbol('gxt-stub-SUSPENSE_CONTEXT');
export const $PROPS_SYMBOL: any = Symbol('gxt-stub-$PROPS_SYMBOL');
export const $SLOTS_SYMBOL: any = Symbol('gxt-stub-$SLOTS_SYMBOL');
export const $args: any = Symbol('gxt-stub-$args');
export const $fwProp: any = Symbol('gxt-stub-$fwProp');
export const $template: any = Symbol('gxt-stub-$template');
export const $_MANAGERS: any = {};

// ---------------------------------------------------------------------------
// Reactive primitives. Classic-mode code paths are gated by __GXT_MODE__ so
// these should never execute, but we provide defensive shapes.
// ---------------------------------------------------------------------------
export const cell: any = (initial?: any) => {
  let v = initial;
  return {
    get value() {
      return v;
    },
    update(next: any) {
      v = next;
    },
  };
};
export const cellFor: any = (..._args: any[]) => undefined;
export const formula: any = (fn?: any) => ({
  get value() {
    return typeof fn === 'function' ? fn() : undefined;
  },
});
export const cached: any = (fn?: any) => fn;
export const effect: any =
  (..._args: any[]) =>
  () =>
    undefined;
export const tracked: any = (..._args: any[]) => undefined;

// ---------------------------------------------------------------------------
// Tracker (currentTracker) accessors.
// ---------------------------------------------------------------------------
export const setTracker: any = (..._args: any[]) => undefined;
export const getTracker: any = (..._args: any[]) => null;

// ---------------------------------------------------------------------------
// Rendering / context API.
// ---------------------------------------------------------------------------
export const createRoot: any = (..._args: any[]) => null;
export const setParentContext: any = (..._args: any[]) => undefined;
export const getParentContext: any = (..._args: any[]) => null;
export const provideContext: any = (..._args: any[]) => undefined;
export const getContext: any = (..._args: any[]) => null;
export const pushParentContext: any = (..._args: any[]) => undefined;
export const popParentContext: any = (..._args: any[]) => undefined;
export const renderComponent: any = (..._args: any[]) => null;
export const destroyElementSync: any = (..._args: any[]) => undefined;
export const initDOM: any = (..._args: any[]) => undefined;
export const isRendering: any = (..._args: any[]) => false;
export const setIsRendering: any = (..._args: any[]) => undefined;
export const syncDom: any = (..._args: any[]) => undefined;
export const takeRenderingControl: any = (..._args: any[]) => undefined;
export const targetFor: any = (..._args: any[]) => null;
export const resolveRenderable: any = (..._args: any[]) => null;
export const cleanupFastContext: any = (..._args: any[]) => undefined;
export const configureGXT: any = (..._args: any[]) => undefined;
export const followPromise: any = (..._args: any[]) => undefined;
export const registerDestructor: any = (..._args: any[]) => undefined;
export const runDestructors: any = (..._args: any[]) => undefined;
export const scope: any = (..._args: any[]) => undefined;
export const getNodeCounter: any = (..._args: any[]) => 0;
export const incrementNodeCounter: any = (..._args: any[]) => undefined;
export const resetNodeCounter: any = (..._args: any[]) => undefined;

// ---------------------------------------------------------------------------
// Compiled-template primitives (`$_*`). In classic mode no gxt-compiled
// template is rendered, so these are no-ops. They appear in `static template
// = ...` member initializers which run when the class is first referenced.
// ---------------------------------------------------------------------------
const noop: any = (..._args: any[]) => undefined;
export const $_fin: any = noop;
export const $_if: any = noop;
export const $_c: any = noop;
export const $_each: any = noop;
export const $_eachSync: any = noop;
export const $_inElement: any = noop;
export const $_slot: any = noop;
export const $_emptySlot: any = noop;
export const $_helper: any = noop;
export const $_component: any = noop;
export const $_componentHelper: any = noop;
export const $_modifierHelper: any = noop;
export const $_maybeModifier: any = noop;
export const $_hasBlock: any = (..._args: any[]) => false;
export const $_hasBlockParams: any = (..._args: any[]) => false;
export const $_unwrapArgs: any = (a?: any) => a;
export const $_unwrapHelperArg: any = (a?: any) => a;
export const $_args: any = (..._args: any[]) => ({});
export const $_api: any = {};
export const $_ucw: any = noop;
export const $_edp: any = noop;
export const $_GET_ARGS: any = noop;
export const $_GET_FW: any = noop;
export const $_GET_SCOPES: any = noop;
export const $_GET_SLOTS: any = noop;
export const $_TO_VALUE: any = (a?: any) => a;
export const $_HTMLProvider: any = noop;
export const $_SVGProvider: any = noop;
export const $_MathMLProvider: any = noop;

// Built-in helpers exposed by gxt as `$__*`.
export const $__and: any = noop;
export const $__array: any = (...args: any[]) => args;
export const $__debugger: any = noop;
export const $__eq: any = noop;
export const $__fn: any = noop;
export const $__hash: any = (..._args: any[]) => ({});
export const $__if: any = noop;
export const $__log: any = noop;
export const $__not: any = noop;
export const $__or: any = noop;

// `hbs` template tag — used by a single test file to compile templates. In
// classic mode that test path is exercised through the regular template
// compiler; this no-op tag returns an empty factory so the import resolves.
export const hbs: any =
  (..._args: any[]) =>
  () =>
    undefined;

// Wrapper primitives used by gxt-backend/ember-gxt-wrappers.ts via the
// namespace import. These are accessed as `gxtModule.$_maybeHelper`/etc;
// only the wrapper-redirect Vite plugin (GXT mode) substitutes them with
// Ember-aware versions. In classic mode the gxt-backend module loads but
// never executes its rendering paths, so no-ops are sufficient.
export const $_maybeHelper: any = noop;
export const $_tag: any = noop;
export const $_dc: any = noop;
