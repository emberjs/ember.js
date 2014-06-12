import { get } from "ember-metal/property_get";
import { map } from "ember-metal/array";
import ControllerMixin from "ember-runtime/mixins/controller";
import {
  resolveParams as handlebarsResolve,
  handlebarsGet
} from "ember-handlebars/ext";
import { typeOf } from 'ember-metal/utils';
import { get } from "ember-metal/property_get";

export function routeArgs(targetRouteName, models, queryParams) {
  var args = [];
  if (typeOf(targetRouteName) === 'string') {
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

export function resolveParams(context, params, options) {
  return map.call(resolvePaths(context, params, options), function(path, i) {
    if (null === path) {
      // Param was string/number, not a path, so just return raw string/number.
      return params[i];
    } else {
      return handlebarsGet(context, path, options);
    }
  });
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

export function resolvePaths(context, params, options) {
  var resolved = handlebarsResolve(context, params, options),
      types = options.types;

  return map.call(resolved, function(object, i) {
    if (types[i] === 'ID') {
      return unwrap(object, params[i]);
    } else {
      return null;
    }
  });

  function unwrap(object, path) {
    if (path === 'controller') { return path; }

    if (ControllerMixin.detect(object)) {
      return unwrap(get(object, 'model'), path ? path + '.model' : 'model');
    } else {
      return path;
    }
  }
}
