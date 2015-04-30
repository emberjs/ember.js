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
  var targetRouteName = handlerInfos[handlerInfos.length-1].name;
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
