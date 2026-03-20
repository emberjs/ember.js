import { Dict } from '../core';
import InternalRouteInfo, {
  ModelFor,
  ResolvedRouteInfo,
  Route,
  UnresolvedRouteInfoByObject,
  UnresolvedRouteInfoByParam,
} from '../route-info';
import Router, { ParsedHandler } from '../router';
import { TransitionIntent } from '../transition-intent';
import TransitionState from '../transition-state';
import { isParam, merge } from '../utils';

export default class NamedTransitionIntent<R extends Route> extends TransitionIntent<R> {
  name: string;
  pivotHandler?: Route;
  contexts: ModelFor<R>[];
  queryParams: Dict<unknown>;
  preTransitionState?: TransitionState<R> = undefined;

  constructor(
    router: Router<R>,
    name: string,
    pivotHandler: Route | undefined,
    contexts: ModelFor<R>[] = [],
    queryParams: Dict<unknown> = {},
    data?: {}
  ) {
    super(router, data);
    this.name = name;
    this.pivotHandler = pivotHandler;
    this.contexts = contexts;
    this.queryParams = queryParams;
  }

  applyToState(oldState: TransitionState<R>, isIntermediate: boolean): TransitionState<R> {
    let handlers: ParsedHandler[] = this.router.recognizer.handlersFor(this.name);

    let targetRouteName = handlers[handlers.length - 1].handler;

    return this.applyToHandlers(oldState, handlers, targetRouteName, isIntermediate, false);
  }

  applyToHandlers(
    oldState: TransitionState<R>,
    parsedHandlers: ParsedHandler[],
    targetRouteName: string,
    isIntermediate: boolean,
    checkingIfActive: boolean
  ) {
    let i, len;
    let newState = new TransitionState<R>();
    let objects = this.contexts.slice(0);

    let invalidateIndex = parsedHandlers.length;

    // Pivot handlers are provided for refresh transitions
    if (this.pivotHandler) {
      for (i = 0, len = parsedHandlers.length; i < len; ++i) {
        if (parsedHandlers[i].handler === this.pivotHandler._internalName) {
          invalidateIndex = i;
          break;
        }
      }
    }

    for (i = parsedHandlers.length - 1; i >= 0; --i) {
      let result = parsedHandlers[i];
      let name = result.handler;

      let oldHandlerInfo = oldState.routeInfos[i];
      let newHandlerInfo:
        | InternalRouteInfo<R>
        | UnresolvedRouteInfoByObject<R>
        | ResolvedRouteInfo<R>
        | null = null;

      if (result.names.length > 0) {
        if (i >= invalidateIndex) {
          newHandlerInfo = this.createParamHandlerInfo(name, result.names, objects, oldHandlerInfo);
        } else {
          newHandlerInfo = this.getHandlerInfoForDynamicSegment(
            name,
            result.names,
            objects,
            oldHandlerInfo,
            targetRouteName,
            i
          );
        }
      } else {
        // This route has no dynamic segment.
        // Therefore treat as a param-based handlerInfo
        // with empty params. This will cause the `model`
        // hook to be called with empty params, which is desirable.
        newHandlerInfo = this.createParamHandlerInfo(name, result.names, objects, oldHandlerInfo);
      }

      if (checkingIfActive) {
        // If we're performing an isActive check, we want to
        // serialize URL params with the provided context, but
        // ignore mismatches between old and new context.
        newHandlerInfo = newHandlerInfo.becomeResolved(
          null,
          // SAFETY: This seems to imply that it would be resolved, but it's unclear if that's actually the case.
          newHandlerInfo.context as Awaited<typeof newHandlerInfo.context>
        );
        let oldContext = oldHandlerInfo && oldHandlerInfo.context;
        if (
          result.names.length > 0 &&
          oldHandlerInfo.context !== undefined &&
          newHandlerInfo.context === oldContext
        ) {
          // If contexts match in isActive test, assume params also match.
          // This allows for flexibility in not requiring that every last
          // handler provide a `serialize` method
          newHandlerInfo.params = oldHandlerInfo && oldHandlerInfo.params;
        }
        newHandlerInfo.context = oldContext as Awaited<typeof oldContext>;
      }

      let handlerToUse:
        | InternalRouteInfo<R>
        | UnresolvedRouteInfoByObject<R>
        | ResolvedRouteInfo<R> = oldHandlerInfo;

      if (i >= invalidateIndex || newHandlerInfo.shouldSupersede(oldHandlerInfo)) {
        invalidateIndex = Math.min(i, invalidateIndex);
        handlerToUse = newHandlerInfo;
      }

      if (isIntermediate && !checkingIfActive) {
        handlerToUse = handlerToUse.becomeResolved(
          null,
          // SAFETY: This seems to imply that it would be resolved, but it's unclear if that's actually the case.
          handlerToUse.context as ModelFor<R>
        );
      }

      newState.routeInfos.unshift(handlerToUse);
    }

    if (objects.length > 0) {
      throw new Error(
        'More context objects were passed than there are dynamic segments for the route: ' +
          targetRouteName
      );
    }

    if (!isIntermediate) {
      this.invalidateChildren(newState.routeInfos, invalidateIndex);
    }

    merge(newState.queryParams, this.queryParams || {});
    if (isIntermediate && oldState.queryParams) {
      merge(newState.queryParams, oldState.queryParams);
    }

    return newState;
  }

  invalidateChildren(handlerInfos: InternalRouteInfo<R>[], invalidateIndex: number) {
    for (let i = invalidateIndex, l = handlerInfos.length; i < l; ++i) {
      let handlerInfo = handlerInfos[i];
      if (handlerInfo.isResolved) {
        let { name, params, route, paramNames } = handlerInfos[i];
        handlerInfos[i] = new UnresolvedRouteInfoByParam(
          this.router,
          name,
          paramNames,
          params,
          route
        );
      }
    }
  }

  getHandlerInfoForDynamicSegment(
    name: string,
    names: string[],
    objects: ModelFor<R>[],
    oldHandlerInfo: InternalRouteInfo<R>,
    _targetRouteName: string,
    i: number
  ): UnresolvedRouteInfoByObject<R> {
    let objectToUse: ModelFor<R> | PromiseLike<ModelFor<R>> | undefined;
    if (objects.length > 0) {
      // Use the objects provided for this transition.
      objectToUse = objects[objects.length - 1];
      if (isParam(objectToUse)) {
        return this.createParamHandlerInfo(name, names, objects, oldHandlerInfo);
      } else {
        objects.pop();
      }
    } else if (oldHandlerInfo && oldHandlerInfo.name === name) {
      // Reuse the matching oldHandlerInfo
      return oldHandlerInfo;
    } else {
      if (this.preTransitionState) {
        let preTransitionHandlerInfo = this.preTransitionState.routeInfos[i] as
          | ResolvedRouteInfo<R>
          | undefined;
        objectToUse = preTransitionHandlerInfo?.context;
      } else {
        // Ideally we should throw this error to provide maximal
        // information to the user that not enough context objects
        // were provided, but this proves too cumbersome in Ember
        // in cases where inner template helpers are evaluated
        // before parent helpers un-render, in which cases this
        // error somewhat prematurely fires.
        //throw new Error("Not enough context objects were provided to complete a transition to " + targetRouteName + ". Specifically, the " + name + " route needs an object that can be serialized into its dynamic URL segments [" + names.join(', ') + "]");
        return oldHandlerInfo;
      }
    }

    return new UnresolvedRouteInfoByObject(this.router, name, names, objectToUse);
  }

  createParamHandlerInfo(
    name: string,
    names: string[],
    objects: unknown[],
    oldHandlerInfo: InternalRouteInfo<R>
  ) {
    let params: Dict<unknown> = {};

    // Soak up all the provided string/numbers
    let numNames = names.length;
    let missingParams = [];
    while (numNames--) {
      // Only use old params if the names match with the new handler
      let oldParams =
        (oldHandlerInfo && name === oldHandlerInfo.name && oldHandlerInfo.params) || {};

      let peek = objects[objects.length - 1];
      let paramName = names[numNames];
      if (isParam(peek)) {
        params[paramName] = '' + objects.pop();
      } else {
        // If we're here, this means only some of the params
        // were string/number params, so try and use a param
        // value from a previous handler.
        if (oldParams.hasOwnProperty(paramName)) {
          params[paramName] = oldParams[paramName];
        } else {
          missingParams.push(paramName);
        }
      }
    }
    if (missingParams.length > 0) {
      throw new Error(
        `You didn't provide enough string/numeric parameters to satisfy all of the dynamic segments for route ${name}.` +
          ` Missing params: ${missingParams}`
      );
    }

    return new UnresolvedRouteInfoByParam(this.router, name, names, params);
  }
}
