declare module '@ember/routing/lib/utils' {
  import type { ControllerQueryParam, ControllerQueryParamType } from '@ember/controller';
  import type Router from 'router_js';
  import type { ExtendedInternalRouteInfo } from '@ember/routing/route';
  import type Route from '@ember/routing/route';
  import type EmberRouter from '@ember/routing/router';
  export type ExpandedControllerQueryParam = {
    as: string | null;
    scope: string;
    type?: ControllerQueryParamType;
  };
  export type NamedRouteArgs =
    | [routeNameOrUrl: string, ...modelsAndOptions: [...unknown[], RouteOptions]]
    | [routeNameOrUrl: string, ...models: unknown[]];
  export type UnnamedRouteArgs =
    | [...modelsAndOptions: [...unknown[], RouteOptions]]
    | [...models: unknown[]]
    | [options: RouteOptions];
  export type RouteArgs = NamedRouteArgs | UnnamedRouteArgs;
  type ExtractedArgs = {
    routeName: string | undefined;
    models: unknown[];
    queryParams: Record<string, unknown>;
  };
  export type RouteOptions = {
    queryParams: Record<string, unknown>;
  };
  export function extractRouteArgs(args: RouteArgs): ExtractedArgs;
  export function getActiveTargetName(router: Router<Route>): string;
  export function stashParamNames(
    router: EmberRouter,
    routeInfos: Array<ExtendedInternalRouteInfo<Route>> & {
      _namesStashed?: boolean;
    }
  ): void;
  export function calculateCacheKey(
    prefix: string,
    parts: string[] | undefined,
    values: {} | null
  ): string;
  export function normalizeControllerQueryParams(
    queryParams: Readonly<ControllerQueryParam[]>
  ): Record<string, ExpandedControllerQueryParam>;
  export function resemblesURL(str: unknown): str is string;
  export function prefixRouteNameArg<T extends NamedRouteArgs | UnnamedRouteArgs>(
    route: Route,
    args: T
  ): T;
  export function shallowEqual<A extends object, B extends object>(a: A, b: B): boolean;
  export {};
}
