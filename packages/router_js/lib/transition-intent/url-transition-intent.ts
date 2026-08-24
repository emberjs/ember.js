import type { BaseRoute, default as InternalRouteInfo } from '../route-info';
import { UnresolvedRouteInfoByParam } from '../route-info';
import type Router from '../router';
import { TransitionIntent } from '../transition-intent';
import TransitionState from '../transition-state';
import UnrecognizedURLError from '../unrecognized-url-error';
import { merge } from '../utils';

export default class URLTransitionIntent<R extends BaseRoute> extends TransitionIntent<R> {
  preTransitionState?: TransitionState<R>;
  url: string;
  constructor(router: Router<R>, url: string, data?: object) {
    super(router, data);
    this.url = url;
    this.preTransitionState = undefined;
  }

  applyToState(oldState: TransitionState<R>) {
    let newState = new TransitionState<R>();
    let results = this.router.recognizer.recognize(this.url),
      i,
      len;

    if (!results) {
      throw new UnrecognizedURLError(this.url);
    }

    let statesDiffer = false;
    let _url = this.url;

    // For the case where the route is loaded asynchronously, the error will be
    // thrown once it is loaded.
    function checkAccessibility(routeInfo: InternalRouteInfo<R>) {
      if (routeInfo.inaccessibleByURL) {
        throw new UnrecognizedURLError(_url);
      }
    }

    for (i = 0, len = results.length; i < len; ++i) {
      let result = results[i]!;
      let name = result.handler as string;
      let paramNames: string[] = [];

      if (this.router.recognizer.hasRoute(name)) {
        paramNames = this.router.recognizer.handlersFor(name)[i].names;
      }

      let newRouteInfo = new UnresolvedRouteInfoByParam(
        this.router,
        name,
        paramNames,
        result.params
      );

      let route = newRouteInfo.route;

      if (route) {
        checkAccessibility(newRouteInfo);
      } else {
        newRouteInfo.routePromise = newRouteInfo.routePromise.then((handler) => {
          checkAccessibility(newRouteInfo);
          return handler;
        });
      }

      let oldRouteInfo = oldState.routeInfos[i]!;
      if (statesDiffer || newRouteInfo.shouldSupersede(oldRouteInfo)) {
        statesDiffer = true;
        newState.routeInfos[i] = newRouteInfo;
      } else {
        newState.routeInfos[i] = oldRouteInfo;
      }
    }

    merge(newState.queryParams, results.queryParams);

    return newState;
  }
}
