import assign from 'ember-metal/assign';
import { get } from 'ember-metal/property_get';

export function routeArgs(targetRouteName, models, queryParams) {
  var args = [];
  if (typeof targetRouteName === 'string') {
    args.push('' + targetRouteName);
  }
  args.push.apply(args, models);
  args.push({ queryParams: queryParams });
  return args;
}

export function getActiveTargetName(router) {
  var handlerInfos = router.activeTransition ?
                     router.activeTransition.state.handlerInfos :
                     router.state.handlerInfos;
  return handlerInfos[handlerInfos.length - 1].name;
}

export function stashParamNames(router, handlerInfos) {
  if (handlerInfos._namesStashed) { return; }

  // This helper exists because router.js/route-recognizer.js awkwardly
  // keeps separate a handlerInfo's list of parameter names depending
  // on whether a URL transition or named transition is happening.
  // Hopefully we can remove this in the future.
  var targetRouteName = handlerInfos[handlerInfos.length - 1].name;
  var recogHandlers = router.router.recognizer.handlersFor(targetRouteName);
  var dynamicParent = null;

  for (var i = 0, len = handlerInfos.length; i < len; ++i) {
    var handlerInfo = handlerInfos[i];
    var names = recogHandlers[i].names;

    if (names.length) {
      dynamicParent = handlerInfo;
    }

    handlerInfo._names = names;

    var route = handlerInfo.handler;
    route._stashNames(handlerInfo, dynamicParent);
  }

  handlerInfos._namesStashed = true;
}

function _calculateCacheValuePrefix(prefix, part) {
  // calculates the dot seperated sections from prefix that are also
  // at the start of part - which gives us the route name

  // given : prefix = site.article.comments, part = site.article.id
  //      - returns: site.article (use get(values[site.article], 'id') to get the dynamic part - used below)

  // given : prefix = site.article, part = site.article.id
  //      - returns: site.article. (use get(values[site.article], 'id') to get the dynamic part - used below)

  var prefixParts = prefix.split('.');
  var currPrefix = '';

  for (var i = 0, len = prefixParts.length; i < len; i++) {
    var currPart = prefixParts.slice(0, i + 1).join('.');
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
export function calculateCacheKey(prefix, _parts, values) {
  var parts = _parts || [];
  var suffixes = '';
  for (var i = 0, len = parts.length; i < len; ++i) {
    var part = parts[i];
    var cacheValuePrefix = _calculateCacheValuePrefix(prefix, part);
    var value;
    if (values) {
      if (cacheValuePrefix && cacheValuePrefix in values) {
        var partRemovedPrefix = (part.indexOf(cacheValuePrefix) === 0) ? part.substr(cacheValuePrefix.length + 1) : part;
        value = get(values[cacheValuePrefix], partRemovedPrefix);
      } else {
        value = get(values, part);
      }
    }
    suffixes += '::' + part + ':' + value;
  }
  return prefix + suffixes.replace(ALL_PERIODS_REGEX, '-');
}
var ALL_PERIODS_REGEX = /\./g;


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
  if (queryParams._qpMap) {
    return queryParams._qpMap;
  }

  var qpMap = queryParams._qpMap = {};

  for (var i = 0, len = queryParams.length; i < len; ++i) {
    accumulateQueryParamDescriptors(queryParams[i], qpMap);
  }

  return qpMap;
}

function accumulateQueryParamDescriptors(_desc, accum) {
  var desc = _desc;
  var tmp;
  if (typeof desc === 'string') {
    tmp = {};
    tmp[desc] = { as: null };
    desc = tmp;
  }

  for (var key in desc) {
    if (!desc.hasOwnProperty(key)) { return; }

    var singleDesc = desc[key];
    if (typeof singleDesc === 'string') {
      singleDesc = { as: singleDesc };
    }

    tmp = accum[key] || { as: null, scope: 'model' };
    assign(tmp, singleDesc);

    accum[key] = tmp;
  }
}
