/**
@module ember
*/

import { getOwner } from '@ember/-internals/owner';
import { symbol } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { readOnly } from '@ember/object/computed';
import Service from '@ember/service';
import { ModelFor } from 'router_js';
import { Route } from '../..';
import EmberRouter from '../system/router';
import RouterState from '../system/router_state';

const ROUTER = (symbol('ROUTER') as unknown) as string;

/**
  The Routing service is used by LinkTo, and provides facilities for
  the component/view layer to interact with the router.

  This is a private service for internal usage only. For public usage,
  refer to the `Router` service.

  @private
  @class RoutingService
*/
export default class RoutingService<R extends Route> extends Service {
  declare targetState: EmberRouter['targetState'];
  declare currentState: EmberRouter['currentState'];
  declare currentRouteName: EmberRouter['currentRouteName'];
  declare currentPath: EmberRouter['currentPath'];

  get router(): EmberRouter<R> {
    let router = this[ROUTER];
    if (router !== undefined) {
      return router;
    }
    let owner = getOwner(this);
    assert('RoutingService is unexpectedly missing an owner', owner);

    router = owner.lookup('router:main');
    assert(
      'ROUTING SERVICE BUG: Expected router to be an instance of EmberRouter',
      router instanceof EmberRouter
    );
    router.setupRouter();
    return (this[ROUTER] = router);
  }

  hasRoute(routeName: string) {
    return this.router.hasRoute(routeName);
  }

  transitionTo(
    routeName: string,
    models: ModelFor<R>[],
    queryParams: Record<string, unknown>,
    shouldReplace: boolean
  ) {
    let transition = this.router._doTransition(routeName, models, queryParams);

    if (shouldReplace) {
      transition.method('replace');
    }

    return transition;
  }

  normalizeQueryParams(
    routeName: string,
    models: ModelFor<R>[],
    queryParams: Record<string, unknown>
  ) {
    this.router._prepareQueryParams(routeName, models, queryParams);
  }

  _generateURL(routeName: string, models: ModelFor<R>[], queryParams: Record<string, unknown>) {
    let visibleQueryParams = {};
    if (queryParams) {
      Object.assign(visibleQueryParams, queryParams);
      this.normalizeQueryParams(routeName, models, visibleQueryParams);
    }

    return this.router.generate(routeName, ...models, {
      queryParams: visibleQueryParams,
    });
  }

  generateURL(routeName: string, models: ModelFor<R>[], queryParams: Record<string, unknown>) {
    if (this.router._initialTransitionStarted) {
      return this._generateURL(routeName, models, queryParams);
    } else {
      // Swallow error when transition has not started.
      // When rendering in tests without visit(), we cannot infer the route context which <LinkTo/> needs be aware of
      try {
        return this._generateURL(routeName, models, queryParams);
      } catch (_e) {
        return;
      }
    }
  }

  isActiveForRoute(
    contexts: ModelFor<R>[],
    queryParams: Record<string, unknown> | undefined,
    routeName: string,
    routerState: RouterState<R>
  ): boolean {
    let handlers = this.router._routerMicrolib.recognizer.handlersFor(routeName);
    let leafName = handlers[handlers.length - 1].handler;
    let maximumContexts = numberOfContextsAcceptedByHandler(routeName, handlers);

    // NOTE: any ugliness in the calculation of activeness is largely
    // due to the fact that we support automatic normalizing of
    // `resource` -> `resource.index`, even though there might be
    // dynamic segments / query params defined on `resource.index`
    // which complicates (and makes somewhat ambiguous) the calculation
    // of activeness for links that link to `resource` instead of
    // directly to `resource.index`.

    // if we don't have enough contexts revert back to full route name
    // this is because the leaf route will use one of the contexts
    if (contexts.length > maximumContexts) {
      routeName = leafName;
    }

    return routerState.isActiveIntent(routeName, contexts, queryParams);
  }
}

RoutingService.reopen({
  targetState: readOnly('router.targetState'),
  currentState: readOnly('router.currentState'),
  currentRouteName: readOnly('router.currentRouteName'),
  currentPath: readOnly('router.currentPath'),
});

function numberOfContextsAcceptedByHandler(handlerName: string, handlerInfos: any[]) {
  let req = 0;
  for (let i = 0; i < handlerInfos.length; i++) {
    req += handlerInfos[i].names.length;
    if (handlerInfos[i].handler === handlerName) {
      break;
    }
  }

  return req;
}
