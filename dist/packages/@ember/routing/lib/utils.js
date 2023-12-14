import { get } from '@ember/-internals/metal';
import { getOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import EngineInstance from '@ember/engine/instance';
import { STATE_SYMBOL } from 'router_js';
const ALL_PERIODS_REGEX = /\./g;
export function extractRouteArgs(args) {
  // SAFETY: This should just be the same thing
  args = args.slice();
  let possibleOptions = args[args.length - 1];
  let queryParams;
  if (isRouteOptions(possibleOptions)) {
    args.pop(); // Remove options
    queryParams = possibleOptions.queryParams;
  } else {
    queryParams = {};
  }
  let routeName;
  if (typeof args[0] === 'string') {
    routeName = args.shift();
    // We just checked this!
    assert('routeName is a string', typeof routeName === 'string');
  }
  // SAFTEY: We removed the name and options if they existed, only models left.
  let models = args;
  return {
    routeName,
    models,
    queryParams
  };
}
export function getActiveTargetName(router) {
  let routeInfos = router.activeTransition ? router.activeTransition[STATE_SYMBOL].routeInfos : router.state.routeInfos;
  let lastRouteInfo = routeInfos[routeInfos.length - 1];
  assert('has last route info', lastRouteInfo);
  return lastRouteInfo.name;
}
export function stashParamNames(router, routeInfos) {
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
  let dynamicParent;
  for (let i = 0; i < routeInfos.length; ++i) {
    let routeInfo = routeInfos[i];
    assert('has route info', routeInfo);
    let names = recogHandlers[i].names;
    if (names.length) {
      dynamicParent = routeInfo;
    }
    routeInfo['_names'] = names;
    let route = routeInfo.route;
    route._stashNames(routeInfo, dynamicParent);
  }
  routeInfos['_namesStashed'] = true;
}
function _calculateCacheValuePrefix(prefix, part) {
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
export function calculateCacheKey(prefix, parts = [], values) {
  let suffixes = '';
  for (let part of parts) {
    let cacheValuePrefix = _calculateCacheValuePrefix(prefix, part);
    let value;
    if (values) {
      if (cacheValuePrefix && cacheValuePrefix in values) {
        let partRemovedPrefix = part.indexOf(cacheValuePrefix) === 0 ? part.substring(cacheValuePrefix.length + 1) : part;
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
export function normalizeControllerQueryParams(queryParams) {
  let qpMap = {};
  for (let queryParam of queryParams) {
    accumulateQueryParamDescriptors(queryParam, qpMap);
  }
  return qpMap;
}
function accumulateQueryParamDescriptors(_desc, accum) {
  let desc = typeof _desc === 'string' ? {
    [_desc]: {
      as: null
    }
  } : _desc;
  for (let key in desc) {
    if (!Object.prototype.hasOwnProperty.call(desc, key)) {
      return;
    }
    let _singleDesc = desc[key];
    let singleDesc = typeof _singleDesc === 'string' ? {
      as: _singleDesc
    } : _singleDesc;
    let partialVal = accum[key] || {
      as: null,
      scope: 'model'
    };
    let val = {
      ...partialVal,
      ...singleDesc
    };
    accum[key] = val;
  }
}
/*
  Check if a routeName resembles a url instead

  @private
*/
export function resemblesURL(str) {
  return typeof str === 'string' && (str === '' || str[0] === '/');
}
/*
  Returns an arguments array where the route name arg is prefixed based on the mount point

  @private
*/
export function prefixRouteNameArg(route, args) {
  let routeName;
  let owner = getOwner(route);
  assert('Expected route to have EngineInstance as owner', owner instanceof EngineInstance);
  let prefix = owner.mountPoint;
  // only alter the routeName if it's actually referencing a route.
  if (owner.routable && typeof args[0] === 'string') {
    routeName = args[0];
    if (resemblesURL(routeName)) {
      throw new Error('Programmatic transitions by URL cannot be used within an Engine. Please use the route name instead.');
    } else {
      routeName = `${prefix}.${routeName}`;
      args[0] = routeName;
    }
  }
  return args;
}
export function shallowEqual(a, b) {
  let aCount = 0;
  let bCount = 0;
  for (let kA in a) {
    if (Object.prototype.hasOwnProperty.call(a, kA)) {
      if (a[kA] !== b[kA]) {
        return false;
      }
      aCount++;
    }
  }
  for (let kB in b) {
    if (Object.prototype.hasOwnProperty.call(b, kB)) {
      bCount++;
    }
  }
  return aCount === bCount;
}
function isRouteOptions(value) {
  if (value && typeof value === 'object') {
    let qps = value.queryParams;
    if (qps && typeof qps === 'object') {
      return Object.keys(qps).every(k => typeof k === 'string');
    }
  }
  return false;
}