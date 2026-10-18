// gxt NATIVE layer — alias target for
// `@ember/-internals/routing/route-managers/classic/outlet-component`.
//
// Upstream's classic route wrapper (`CLASSIC_OUTLET`) is a Glimmer VM internal
// component that renders a classic route template inside the `RootOutlet`
// component tree. Native renders routes with its own outlet
// (native/root-outlet.ts, native/outlet.ts), so the classic route manager's
// `getRouteWrapper()` only needs a stable object to hand back.
export const CLASSIC_OUTLET: object = Object.freeze({});
