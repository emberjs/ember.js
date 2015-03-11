/**
@module ember
@submodule ember-routing
*/

import Service from "ember-runtime/system/service";

import { get } from "ember-metal/property_get";
import { readOnly } from "ember-metal/computed_macros";
import { routeArgs } from "ember-routing/utils";
import keys from "ember-metal/keys";
import merge from "ember-metal/merge";

/** @private
  The Routing service is used by LinkView, and provides facilities for
  the component/view layer to interact with the router.

  While still private, this service can eventually be opened up, and provides
  the set of API needed for components to control routing without interacting
  with router internals.
*/

var RoutingService = Service.extend({
  router: null,

  targetState: readOnly('router.targetState'),
  currentState: readOnly('router.currentState'),
  currentRouteName: readOnly('router.currentRouteName'),

  availableRoutes: function() {
    return keys(get(this, 'router').router.recognizer.names);
  },

  hasRoute: function(routeName) {
    return get(this, 'router').hasRoute(routeName);
  },

  transitionTo: function(routeName, models, queryParams, shouldReplace) {
    var router = get(this, 'router');

    var transition = router._doTransition(routeName, models, queryParams);

    if (shouldReplace) {
      transition.method('replace');
    }
  },

  normalizeQueryParams: function(routeName, models, queryParams) {
    get(this, 'router')._prepareQueryParams(routeName, models, queryParams);
  },

  generateURL: function(routeName, models, queryParams) {
    var router = get(this, 'router');

    var visibleQueryParams = {};
    merge(visibleQueryParams, queryParams);

    this.normalizeQueryParams(routeName, models, visibleQueryParams);

    var args = routeArgs(routeName, models, visibleQueryParams);
    return router.generate.apply(router, args);
  },

  isActiveForRoute: function(contexts, queryParams, routeName, routerState, isCurrentWhenSpecified) {
    var router = get(this, 'router');

    var handlers = router.router.recognizer.handlersFor(routeName);
    var leafName = handlers[handlers.length-1].handler;
    var maximumContexts = numberOfContextsAcceptedByHandler(routeName, handlers);

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

    return routerState.isActiveIntent(routeName, contexts, queryParams, !isCurrentWhenSpecified);
  }
});

var numberOfContextsAcceptedByHandler = function(handler, handlerInfos) {
  var req = 0;
  for (var i = 0, l = handlerInfos.length; i < l; i++) {
    req = req + handlerInfos[i].names.length;
    if (handlerInfos[i].handler === handler) {
      break;
    }
  }

  return req;
};

export default RoutingService;
