// The compat backend's own templates, compiled at build time by the gxt
// compiler under COMPAT_TEMPLATE_FLAGS, the flags of the compat runtime
// compile (vite.config.mjs, rollup.config.mjs: scripts/gxt-alias-map.mjs). Each
// is a gxt template function. compile.ts renders one as it renders a
// runtime-compiled template (`templateForFunction`), and gxt renders the outlet
// one as the `{{outlet}}` keyword's component. A value a template invokes comes
// in through its lexical scope, so none is compiled at runtime.
// `templates.d.ts` types this module for the TypeScript modules importing it.

/**
 * `{{outlet}}` and `<@outlet />`: `<ember-outlet>` renders the next level of
 * the current outlet state.
 */
export const OutletTemplate = <template><ember-outlet /></template>;

/**
 * A level whose route manager provides its own wrapper: the wrapper, invoked
 * with the level's state (the render's `this`).
 */
export function routeWrapperTemplate(RouteWrapper: object) {
  return <template><RouteWrapper
      @Component={{this.Component}}
      @bucket={{this.bucket}}
      @context={{this.context}}
      @outlet={{this.outlet}}
    /></template>;
}

/**
 * A component compiled at build time and resolved by name: its invoker
 * (manager.ts `_gxtBuildTimeInvoker`), handed the invocation's arguments and
 * attributes.
 */
export function buildTimeComponentTemplate(Invoker: object) {
  return <template><Invoker ...attributes @invocation={{this.__gxtBtArgs}} /></template>;
}
