import type { RouteManagement, RouteManager, RouteStateBucket } from 'router_js';

const ROUTE_MANAGEMENT = new WeakMap<object, RouteManagement>();

export function associateRouteManagement(
  route: object,
  manager: RouteManager,
  bucket: RouteStateBucket
): void {
  ROUTE_MANAGEMENT.set(route, { manager, bucket });
}

export function getRouteManagement(route: object): RouteManagement | undefined {
  return ROUTE_MANAGEMENT.get(route);
}
