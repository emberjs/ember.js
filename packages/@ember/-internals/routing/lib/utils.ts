import { get } from '@ember/-internals/metal';
import { getOwner } from '@ember/-internals/owner';
import { assert, deprecate } from '@ember/debug';
import EmberError from '@ember/error';
import Router, { STATE_SYMBOL } from 'router_js';
import Route from './system/route';
import EmberRouter, { PrivateRouteInfo } from './system/router';

const ALL_PERIODS_REGEX = /\./g;

export type ControllerQueryParam =
  | string
  | Record<string, string>
  | { as?: string; scope?: string };
type ExpandedControllerQueryParam = { as: string | null; scope: string };

type Model = object | string | number;

export type NamedRouteArgs =
  | [routeNameOrUrl: string, ...modelsAndOptions: [...Model[], RouteOptions]]
  | [routeNameOrUrl: string, ...models: Model[]];

export type UnnamedRouteArgs =
  | [...modelsAndOptions: [...Model[], RouteOptions]]
  | [...models: Model[]]
  | [options: RouteOptions];

export type RouteArgs = NamedRouteArgs | UnnamedRouteArgs;

type ExtractedArgs = {
  routeName: string | undefined;
  models: Model[];
  queryParams: Record<string, unknown>;
};

export type RouteOptions = { queryParams: Record<string, unknown> };

export function extractRouteArgs(args: RouteArgs): ExtractedArgs {
  args = args.slice();

  let possibleOptions = args.pop();

  let queryParams: Record<string, unknown>;
  if (isRouteOptions(possibleOptions)) {
    queryParams = possibleOptions.queryParams;
  } else {
    // Not query params so return to the array
    if (possibleOptions !== undefined) {
      args.push(possibleOptions);
    }
    queryParams = {};
  }

  let routeName;

  if (typeof args[0] === 'string') {
    routeName = args.shift();
    // We just checked this!
    assert('routeName is a string', typeof routeName === 'string');
  }

  let models = args;

  return { routeName, models, queryParams };
}

export function getActiveTargetName(router: Router<Route>): string {
  let routeInfos = router.activeTransition
    ? router.activeTransition[STATE_SYMBOL]!.routeInfos
    : router.state!.routeInfos;
  let lastRouteInfo = routeInfos[routeInfos.length - 1];
  assert('has last route info', lastRouteInfo);
  return lastRouteInfo.name;
}

export function stashParamNames(router: EmberRouter, routeInfos: PrivateRouteInfo[]): void {
  if (routeInfos['_namesStashed']) {
    return;
  }

  // This helper exists because router.js/route-recognizer.js awkwardly
  // keeps separate a routeInfo's list of parameter names depending
  // on whether a URL transition or named transition is happening.
  // Hopefully we can remove this in the future.
  let routeInfo = routeInfos[routeInfos.length - 1];
  assert('has route info', routeInfo);
  let targetRouteName = routeInfo.name;
  let recogHandlers = router._routerMicrolib.recognizer.handlersFor(targetRouteName);
  let dynamicParent: PrivateRouteInfo;

  for (let i = 0; i < routeInfos.length; ++i) {
    let routeInfo = routeInfos[i];
    assert('has route info', routeInfo);
    let names = recogHandlers[i].names;

    if (names.length) {
      dynamicParent = routeInfo;
    }

    routeInfo['_names'] = names;

    let route = routeInfo.route!;
    route._stashNames(routeInfo, dynamicParent!);
  }

  routeInfos['_namesStashed'] = true;
}

function _calculateCacheValuePrefix(prefix: string, part: string) {
  // calculates the dot separated sections from prefix that are also
  // at the start of part - which gives us the route name

  // given : prefix = site.article.comments, part = site.article.id
  //      - returns: site.article (use get(values[site.article], 'id') to get the dynamic part - used below)

  // given : prefix = site.article, part = site.article.id
  //      - returns: site.article. (use get(values[site.article], 'id') to get the dynamic part - used below)

  let prefixParts = prefix.split('.');
  let currPrefix = '';

  for (let i = 0; i < prefixParts.length; i++) {
    let currPart = prefixParts.slice(0, i + 1).join('.');
    if (part.indexOf(currPart) !== 0) {
      break;
    }
    currPrefix = currPart;
  }

  return currPrefix;
}

/*
  Stolen from Controller
*/
export function calculateCacheKey(prefix: string, parts: string[] = [], values: {} | null): string {
  let suffixes = '';
  for (let part of parts) {
    let cacheValuePrefix = _calculateCacheValuePrefix(prefix, part);
    let value;
    if (values) {
      if (cacheValuePrefix && cacheValuePrefix in values) {
        let partRemovedPrefix =
          part.indexOf(cacheValuePrefix) === 0 ? part.substr(cacheValuePrefix.length + 1) : part;
        value = get(values[cacheValuePrefix], partRemovedPrefix);
      } else {
        value = get(values, part);
      }
    }
    suffixes += `::${part}:${value}`;
  }
  return prefix + suffixes.replace(ALL_PERIODS_REGEX, '-');
}

/*
  Controller-defined query parameters can come in three shapes:

  Array
    queryParams: ['foo', 'bar']
  Array of simple objects where value is an alias
    queryParams: [
      {
        'foo': 'rename_foo_to_this'
      },
      {
        'bar': 'call_bar_this_instead'
      }
    ]
  Array of fully defined objects
    queryParams: [
      {
        'foo': {
          as: 'rename_foo_to_this'
        },
      }
      {
        'bar': {
          as: 'call_bar_this_instead',
          scope: 'controller'
        }
      }
    ]

  This helper normalizes all three possible styles into the
  'Array of fully defined objects' style.
*/
export function normalizeControllerQueryParams(queryParams: ControllerQueryParam[]) {
  let qpMap: Record<string, ExpandedControllerQueryParam> = {};

  for (let queryParam of queryParams) {
    accumulateQueryParamDescriptors(queryParam, qpMap);
  }

  return qpMap;
}

function accumulateQueryParamDescriptors(
  _desc: ControllerQueryParam,
  accum: Record<string, ExpandedControllerQueryParam>
) {
  let desc: {} = _desc;
  let tmp: {};
  if (typeof desc === 'string') {
    tmp = {};
    tmp[desc] = { as: null };
    desc = tmp;
  }

  for (let key in desc) {
    if (!Object.prototype.hasOwnProperty.call(desc, key)) {
      return;
    }

    let singleDesc = desc[key];
    if (typeof singleDesc === 'string') {
      singleDesc = { as: singleDesc };
    }

    let val = accum[key] || { as: null, scope: 'model' };
    Object.assign(val, singleDesc);

    accum[key] = val;
  }
}

/*
  Check if a routeName resembles a url instead

  @private
*/
export function resemblesURL(str: unknown): str is string {
  return typeof str === 'string' && (str === '' || str[0] === '/');
}

/*
  Returns an arguments array where the route name arg is prefixed based on the mount point

  @private
*/
export function prefixRouteNameArg<T extends NamedRouteArgs | UnnamedRouteArgs>(
  route: Route,
  args: T
): T {
  let routeName: string;
  let owner = getOwner(route);
  assert('Route is unexpectedly missing an owner', owner);

  let prefix = owner.mountPoint;

  // only alter the routeName if it's actually referencing a route.
  if (owner.routable && typeof args[0] === 'string') {
    routeName = args[0];
    if (resemblesURL(routeName)) {
      throw new EmberError(
        'Programmatic transitions by URL cannot be used within an Engine. Please use the route name instead.'
      );
    } else {
      routeName = `${prefix}.${routeName}`;
      args[0] = routeName;
    }
  }

  return args;
}

export function shallowEqual(a: {}, b: {}): boolean {
  let k;
  let aCount = 0;
  let bCount = 0;
  for (k in a) {
    if (Object.prototype.hasOwnProperty.call(a, k)) {
      if (a[k] !== b[k]) {
        return false;
      }
      aCount++;
    }
  }

  for (k in b) {
    if (Object.prototype.hasOwnProperty.call(b, k)) {
      bCount++;
    }
  }

  return aCount === bCount;
}

export function deprecateTransitionMethods(frameworkClass: string, methodName: string): void {
  deprecate(
    `Calling ${methodName} on a ${frameworkClass} is deprecated. Use the RouterService instead.`,
    false,
    {
      id: 'routing.transition-methods',
      for: 'ember-source',
      since: {
        available: '3.26.0',
        enabled: '3.26.0',
      },
      until: '5.0.0',
      url: 'https://deprecations.emberjs.com/v3.x/#toc_routing-transition-methods',
    }
  );
}

function isRouteOptions(value: unknown): value is RouteOptions {
  if (value && typeof value === 'object') {
    let qps = (value as RouteOptions).queryParams;
    if (qps && typeof qps === 'object') {
      return Object.keys(qps).every((k) => typeof k === 'string');
    }
  }
  return false;
}
