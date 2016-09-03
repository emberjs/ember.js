import { assign, get } from 'ember-metal';

const ALL_PERIODS_REGEX = /\./g;

export function routeArgs(targetRouteName, models, queryParams) {
  let args = [];
  if (typeof targetRouteName === 'string') {
    args.push('' + targetRouteName);
  }
  args.push.apply(args, models);
  args.push({ queryParams: queryParams });
  return args;
}

export function getActiveTargetName(router) {
  let handlerInfos = router.activeTransition ?
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
  let targetRouteName = handlerInfos[handlerInfos.length - 1].name;
  let recogHandlers = router.router.recognizer.handlersFor(targetRouteName);
  let dynamicParent = null;

  for (let i = 0; i < handlerInfos.length; ++i) {
    let handlerInfo = handlerInfos[i];
    let names = recogHandlers[i].names;

    if (names.length) {
      dynamicParent = handlerInfo;
    }

    handlerInfo._names = names;

    let route = handlerInfo.handler;
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
export function calculateCacheKey(prefix, _parts, values) {
  let parts = _parts || [];
  let suffixes = '';
  for (let i = 0; i < parts.length; ++i) {
    let part = parts[i];
    let cacheValuePrefix = _calculateCacheValuePrefix(prefix, part);
    let value;
    if (values) {
      if (cacheValuePrefix && cacheValuePrefix in values) {
        let partRemovedPrefix = (part.indexOf(cacheValuePrefix) === 0) ? part.substr(cacheValuePrefix.length + 1) : part;
        value = get(values[cacheValuePrefix], partRemovedPrefix);
      } else {
        value = get(values, part);
      }
    }
    suffixes += '::' + part + ':' + value;
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
  if (queryParams._qpMap) {
    return queryParams._qpMap;
  }

  let qpMap = queryParams._qpMap = {};

  for (let i = 0; i < queryParams.length; ++i) {
    accumulateQueryParamDescriptors(queryParams[i], qpMap);
  }

  return qpMap;
}

function accumulateQueryParamDescriptors(_desc, accum) {
  let desc = _desc;
  let tmp;
  if (typeof desc === 'string') {
    tmp = {};
    tmp[desc] = { as: null };
    desc = tmp;
  }

  for (let key in desc) {
    if (!desc.hasOwnProperty(key)) { return; }

    let singleDesc = desc[key];
    if (typeof singleDesc === 'string') {
      singleDesc = { as: singleDesc };
    }

    tmp = accum[key] || { as: null, scope: 'model' };
    assign(tmp, singleDesc);

    accum[key] = tmp;
  }
}
