/**
  Classic query-param event handling, lifted out of the classic `Route`'s
  `actions` hash so the logic lives behind the `RouteManager` boundary. The
  router reaches these via `ClassicRouteManager.queryParamsDidChange` and
  `ClassicRouteManager.finalizeQueryParamChange`, which forward to the
  functions below.
*/

import { A as emberA } from '@ember/array';
import { assert } from '@ember/debug';
import { flushAsyncObservers } from '@ember/-internals/metal/lib/observer';
import { get } from '@ember/-internals/metal/lib/property_get';
import { set } from '@ember/-internals/metal/lib/property_set';
import { stashParamNames } from '@ember/routing/lib/utils';
import type Route from '@ember/routing/route';
import type { QueryParam } from '@ember/routing/router';
import type { Transition } from 'router_js';
import { STATE_SYMBOL } from 'router_js';
import type { ClassicRouteBucket } from './bucket';

// Returns a fresh native array when the value is an array so callers cannot
// mutate the shared default. Also used by `@ember/routing/route`'s QP meta
// building.
export function copyDefaultValue<T>(value: T): T {
  if (Array.isArray(value)) {
    // SAFETY: We lost the type data about the array if we don't cast.
    return emberA(value.slice()) as unknown as T;
  }
  return value;
}

/**
  Classic `queryParamsDidChange`. Triggers a model refresh when a changed query
  param opts into `refreshModel`. Returns `true` so the event keeps bubbling.
 */
export function queryParamsDidChange(
  bucket: ClassicRouteBucket,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  changed: {},
  _totalPresent: unknown,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  removed: {}
): boolean {
  let { route } = bucket;
  // SAFETY: Since `_qp` is protected we can't infer the type
  let qpMap = (get(route, '_qp') as Route['_qp']).map;

  let totalChanged = Object.keys(changed).concat(Object.keys(removed));
  for (let change of totalChanged) {
    let qp = qpMap[change];
    if (qp) {
      let options = route._optionsForQueryParam(qp);
      assert('options exists', options && typeof options === 'object');
      if ((get(options, 'refreshModel') as boolean) && route._router.currentState) {
        route.refresh();
        break;
      }
    }
  }

  return true;
}

/**
  Classic `finalizeQueryParamChange`. Only the `application` route does the
  work: it reconciles every controller's query-param values with the URL and
  collects the final serialized params.
 */
export function finalizeQueryParamChange(
  bucket: ClassicRouteBucket,
  params: Record<string, string | null | undefined>,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  finalParams: {}[],
  transition: Transition
): boolean | void {
  let { route } = bucket;
  if (route.fullRouteName !== 'application') {
    return true;
  }

  // Transition object is absent for intermediate transitions.
  if (!transition) {
    return;
  }

  let routeInfos = transition[STATE_SYMBOL]!.routeInfos;
  let router = route._router;
  let qpMeta = router._queryParamsFor(routeInfos);
  let changes = router._qpUpdates;
  let qpUpdated = false;
  let replaceUrl;

  stashParamNames(router, routeInfos);

  for (let qp of qpMeta.qps) {
    let qpRoute = qp.route;
    let controller = qpRoute.controller;
    let presentKey = qp.urlKey in params && qp.urlKey;

    // Do a reverse lookup to see if the changed query
    // param URL key corresponds to a QP property on
    // this controller.
    let value;
    let svalue: string | null | undefined;
    if (changes.has(qp.urlKey)) {
      // Value updated in/before setupController
      value = get(controller, qp.prop);
      svalue = qpRoute.serializeQueryParam(value, qp.urlKey, qp.type);
    } else {
      if (presentKey) {
        svalue = params[presentKey];

        if (svalue !== undefined) {
          value = qpRoute.deserializeQueryParam(svalue, qp.urlKey, qp.type);
        }
      } else {
        // No QP provided; use default value.
        svalue = qp.serializedDefaultValue;
        value = copyDefaultValue(qp.defaultValue);
      }
    }

    // SAFETY: Since `_qp` is protected we can't infer the type
    controller._qpDelegate = (get(qpRoute, '_qp') as Route['_qp']).states.inactive;

    let thisQueryParamChanged = svalue !== qp.serializedValue;
    if (thisQueryParamChanged) {
      if (transition.queryParamsOnly && replaceUrl !== false) {
        let options = qpRoute._optionsForQueryParam(qp);
        let replaceConfigValue = get(options, 'replace');
        if (replaceConfigValue) {
          replaceUrl = true;
        } else if (replaceConfigValue === false) {
          // Explicit pushState wins over any other replaceStates.
          replaceUrl = false;
        }
      }

      set(controller, qp.prop, value);

      qpUpdated = true;
    }

    // Stash current serialized value of controller.
    qp.serializedValue = svalue;

    let thisQueryParamHasDefaultValue = qp.serializedDefaultValue === svalue;
    if (!thisQueryParamHasDefaultValue) {
      finalParams.push({
        value: svalue,
        visible: true,
        key: presentKey || qp.urlKey,
      });
    }
  }

  // Some QPs have been updated, and those changes need to be propogated
  // immediately. Eventually, we should work on making this async somehow.
  if (qpUpdated === true) {
    flushAsyncObservers(false);
  }

  if (replaceUrl) {
    transition.method('replace');
  }

  qpMeta.qps.forEach((qp: QueryParam) => {
    // SAFETY: Since `_qp` is protected we can't infer the type
    let routeQpMeta = get(qp.route, '_qp') as Route['_qp'];
    let finalizedController = qp.route.controller;
    finalizedController['_qpDelegate'] = get(routeQpMeta, 'states.active');
  });

  router._qpUpdates.clear();
  return;
}
