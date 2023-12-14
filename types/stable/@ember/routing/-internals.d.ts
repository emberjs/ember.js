declare module '@ember/routing/-internals' {
  export { default as RouterState } from '@ember/routing/lib/router_state';
  export { default as RoutingService } from '@ember/routing/lib/routing-service';
  export { type RouteArgs, prefixRouteNameArg } from '@ember/routing/lib/utils';
  export {
    default as generateController,
    generateControllerFactory,
  } from '@ember/routing/lib/generate_controller';
  export { default as BucketCache } from '@ember/routing/lib/cache';
  export { default as DSL, type DSLCallback } from '@ember/routing/lib/dsl';
  export type { EngineRouteInfo } from '@ember/routing/lib/engines';
  export type { RouteInfo, RouteInfoWithAttributes } from '@ember/routing/lib/route-info';
  export { default as controllerFor } from '@ember/routing/lib/controller_for';
}
