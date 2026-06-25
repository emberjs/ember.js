/**
  Classic Route Manager. Encapsulates Ember's existing classic `Route`
  behaviour behind the `RouteManager` API.
*/

import type { Destroyable, Template, TemplateFactory } from '@glimmer/interfaces';
import { hasInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { DEBUG } from '@glimmer/env';
import { assert, info } from '@ember/debug';
import { getOwner, setOwner } from '@ember/-internals/owner';
import type { default as Owner } from '@ember/-internals/owner';
import { get } from '@ember/-internals/metal/lib/property_get';
import { makeRouteTemplate } from '@ember/-internals/glimmer/lib/component-managers/route-template';
import { Promise as RSVPPromise } from 'rsvp';
import { cancel, scheduleOnce } from '@ember/runloop';
import type { InternalRouteInfo, Route as IRoute, RouteInfo, Transition } from 'router_js';
import { throwIfAborted } from 'router_js';
import type Route from '@ember/routing/route';
import type {
  CreateRouteArgs,
  DidEnterState,
  DidExitState,
  EnterState,
  ExitState,
  RouteCapabilities,
  RouteManagerWithClassicInterop,
  WillEnterState,
  WillExitState,
} from '../api';
import { routeCapabilities } from '../api';
import type { QueryParamMeta } from '@ember/routing/route';
import { ClassicRouteBucket } from './bucket';
import {
  finalizeQueryParamChange as finalizeClassicQueryParamChange,
  queryParamsDidChange as classicQueryParamsDidChange,
} from './query-params';
import { enterLoadingSubstate } from './substates';
import { ClassicRouteWrapperDefinition } from './wrapper';

type TransitionLike = Transition & {
  isAborted?: boolean;
  error?: unknown;
  trigger?(ignoreFailure: boolean, name: string, ...args: unknown[]): void;
  resolvedModels?: Record<string, unknown>;
};

function isTransitionObject(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { isTransition?: boolean }).isTransition === true
  );
}

export class ClassicRouteManager implements RouteManagerWithClassicInterop<ClassicRouteBucket> {
  capabilities: RouteCapabilities = routeCapabilities('1.0', { classicInterop: true });

  #owner: Owner;

  constructor(owner: Owner) {
    this.#owner = owner;
  }

  createRoute(_factory: object, args: CreateRouteArgs): ClassicRouteBucket {
    const props = {};
    setOwner(props, this.#owner);
    const route = this.#owner.lookup(`route:${args.name}`) as Route;
    route._setRouteName(args.name);

    const bucket = new ClassicRouteBucket(route);
    route.manager = this;
    route.bucket = bucket;

    return bucket;
  }

  getRenderState(bucket: ClassicRouteBucket) {
    const route = bucket.route;
    let wrapper = this.getRouteWrapper(bucket);
    let invokable = buildClassicInvokable(bucket);

    let owner = getOwner(route);
    assert('Route is unexpectedly missing an owner', owner);

    return {
      owner,
      name: route.routeName,
      controller: route.controller,
      model: route.currentModel,
      wrapper,
      invokable,
      bucket,
    };
  }

  getRouteName(bucket: ClassicRouteBucket): string {
    // Local route name is the last dot-separated segment (e.g. `show` from
    // `posts.show`).
    let fullName = bucket.route.fullRouteName;
    let lastDot = fullName.lastIndexOf('.');
    return lastDot === -1 ? fullName : fullName.slice(lastDot + 1);
  }

  getFullRouteName(bucket: ClassicRouteBucket): string {
    return bucket.route.fullRouteName;
  }

  getDestroyable(bucket: ClassicRouteBucket): Destroyable | null {
    return bucket.route;
  }

  willEnter(bucket: ClassicRouteBucket, state: WillEnterState): void {
    if (!bucket.controller) {
      // Create the controller if it doesn't exist so the outlet can curry
      // @controller as soon as the route renders
      bucket.controller = bucket.route._initController();
    }

    const transition = state.transition as Transition & { isActive: boolean };
    if (!transition.isActive) {
      return;
    }
    bucket.loadingSubstateTimer = scheduleOnce(
      'routerTransitions',
      null,
      enterLoadingSubstate,
      bucket,
      transition
    );
  }

  enter(bucket: ClassicRouteBucket, state: EnterState): Promise<unknown> {
    // Classic model chain: beforeModel → getModel → afterModel. The routeInfo
    // (state.to) dispatches getModel polymorphically based on whether the
    // transition was initiated with a model object or URL params.
    const route = bucket.route;
    const transition = state.transition as TransitionLike;
    const routeInfo = state.internalRouteInfo;

    return RSVPPromise.resolve()
      .then(() => {
        let result: unknown;
        if (route.beforeModel !== undefined) {
          result = route.beforeModel(transition);
        }
        if (isTransitionObject(result)) {
          return undefined;
        }
        return result;
      })
      .then(() => {
        throwIfAborted(transition);
        // We use the `getModel` on the routeInfo, as the routeInfo will be the correct
        // subclass (e.g. ResolvedRouteInfo vs InternalRouteInfo).
        return routeInfo.getModel(transition);
      })
      .then((resolvedModel) => {
        throwIfAborted(transition);
        transition.resolvedModels = transition.resolvedModels || {};
        transition.resolvedModels[routeInfo.name] = resolvedModel;

        let result: unknown;
        if (route.afterModel !== undefined) {
          result = route.afterModel(resolvedModel as never, transition);
        }
        if (isTransitionObject(result)) {
          result = undefined;
        }
        return RSVPPromise.resolve(result).then(() => resolvedModel);
      });
  }

  didEnter(bucket: ClassicRouteBucket, state: DidEnterState): void {
    // Cancel a pending loading substate if `enter` resolved first.
    if (bucket.loadingSubstateTimer) {
      cancel(bucket.loadingSubstateTimer as Parameters<typeof cancel>[0]);
      bucket.loadingSubstateTimer = null;
    }

    const route = bucket.route;
    const transition = state.transition;
    const context = (state.to as unknown as InternalRouteInfo<Route>).context;

    if (state.enter) {
      route.activate(transition);
      route.trigger('activate', transition);
    }

    route.context = context;
    if (route.contextDidChange !== undefined) {
      route.contextDidChange();
    }

    if (route.setup !== undefined) {
      route.setup(context, transition);
    }
  }

  willExit(bucket: ClassicRouteBucket, state: WillExitState): void {
    // Classic _internalReset resets the QP delegate on the controller.
    bucket.route._internalReset(state.isExiting, state.transition);
  }

  exit(bucket: ClassicRouteBucket, state: ExitState = {}): void {
    const route = bucket.route;
    delete route.context;
    route.deactivate(state.transition);
    route.trigger('deactivate', state.transition);
    route.teardownViews();
  }

  didExit(_bucket: ClassicRouteBucket, _state: DidExitState): void {
    // No-op for classic routes.
  }

  getRouteWrapper(bucket: ClassicRouteBucket): object {
    if (bucket.wrapper === undefined) {
      bucket.wrapper = new ClassicRouteWrapperDefinition();
    }
    return bucket.wrapper;
  }

  getInvokable(
    bucket: ClassicRouteBucket,
    enterPromise?: Promise<unknown>
  ): Promise<object | undefined> {
    // Build the invokable synchronously, then gate its resolution on the
    // enter promise so onRouteInvokableReady does not fire (and the real
    // route template does not render) until the model has loaded. During
    // the wait, the deferred scheduleOnce in willEnter fires and enters
    // the loading substate.

    bucket.invokable = buildClassicInvokable(bucket);
    return (enterPromise || Promise.resolve()).then(() => bucket.invokable);
  }

  qp(bucket: ClassicRouteBucket): QueryParamMeta {
    return get(bucket.route, '_qp') as QueryParamMeta;
  }

  stashNames(
    bucket: ClassicRouteBucket,
    routeInfo: InternalRouteInfo<IRoute>,
    dynamicParent: InternalRouteInfo<IRoute>
  ): void {
    bucket.route._stashNames(
      routeInfo as Parameters<Route['_stashNames']>[0],
      dynamicParent as Parameters<Route['_stashNames']>[1]
    );
  }

  serializeQueryParam(
    bucket: ClassicRouteBucket,
    value: unknown,
    urlKey: string,
    defaultValueType: string
  ): unknown {
    return bucket.route.serializeQueryParam(value, urlKey, defaultValueType);
  }

  deserializeQueryParam(
    bucket: ClassicRouteBucket,
    value: unknown,
    urlKey: string,
    defaultValueType: string
  ): unknown {
    return bucket.route.deserializeQueryParam(value, urlKey, defaultValueType);
  }

  serializeContext(
    bucket: ClassicRouteBucket,
    routeInfo: InternalRouteInfo<Route>,
    value: unknown
  ): Record<string, unknown> | undefined {
    return bucket.route.serialize(value, routeInfo.paramNames) as
      | Record<string, unknown>
      | undefined;
  }

  queryParamsDidChange(
    bucket: ClassicRouteBucket,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    changed: {},
    totalPresent: unknown,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    removed: {}
  ): boolean | void {
    return classicQueryParamsDidChange(bucket, changed, totalPresent, removed);
  }

  finalizeQueryParamChange(
    bucket: ClassicRouteBucket,
    params: Record<string, string | null | undefined>,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    finalParams: {}[],
    transition: Transition
  ): boolean | void {
    return finalizeClassicQueryParamChange(bucket, params, finalParams, transition);
  }

  getContext(
    bucket: ClassicRouteBucket,
    params: Record<string, unknown>,
    transition: Transition
  ): unknown {
    const route = bucket.route;
    // `deserialize` is the router-contract entry point: it scopes the full
    // params down to this route's own params (via `paramsFor`) before
    // delegating to the user's `model` hook. Calling `model` directly would
    // pass it the un-scoped params, so `deserialize` is preferred and `model`
    // is only a fallback for handlers that don't define `deserialize`.
    if (route.deserialize) {
      return route.deserialize(params, transition);
    }
    if (route.model) {
      return route.model(params, transition);
    }
    return undefined;
  }

  redirect(
    bucket: ClassicRouteBucket,
    _routeInfo: RouteInfo,
    context: unknown,
    transition: Transition
  ): void {
    bucket.route.redirect(context as never, transition);
  }

  getRouteInfoMetadata(bucket: ClassicRouteBucket): unknown {
    return bucket.route.buildRouteInfoMetadata();
  }
}

// Build or return cached invokable for a classic route: look up `template:<name>`,
// upgrade a TemplateFactory into a Template, then wrap as a RouteTemplate. If the
// lookup returns a component definition, use it directly. Falls back to the
// shared top-level `{{outlet}}` template when no template is registered.
function buildClassicInvokable(bucket: ClassicRouteBucket): object {
  if (bucket.invokable !== undefined) {
    return bucket.invokable;
  }

  const route = bucket.route;
  const owner = getOwner(route);
  assert('Route is unexpectedly missing an owner', owner);

  const name = route.templateName || route.routeName;
  const templateFactoryOrComponent = owner.lookup(`template:${name}`) as
    | TemplateFactory
    | object
    | undefined;

  let invokable: object;

  if (templateFactoryOrComponent) {
    if (hasInternalComponentManager(templateFactoryOrComponent)) {
      // ComponentLike, used directly as the invokable.
      invokable = templateFactoryOrComponent;
    } else {
      if (DEBUG && typeof templateFactoryOrComponent !== 'function') {
        let label: string;
        try {
          label = `\`${String(templateFactoryOrComponent)}\``;
        } catch {
          label = 'an unknown object';
        }
        assert(
          `Failed to render the ${name} route, expected ` +
            `\`template:${name}\` to resolve into ` +
            `a component or a \`TemplateFactory\`, got: ${label}. ` +
            `Most likely an improperly defined class or an invalid module export.`
        );
      }

      const template = (templateFactoryOrComponent as TemplateFactory)(owner);
      invokable = makeRouteTemplate(owner, name, template as Template);
    }
  } else {
    if (DEBUG) {
      const LOG_VIEW_LOOKUPS = get(route._router, 'namespace.LOG_VIEW_LOOKUPS');
      if (LOG_VIEW_LOOKUPS) {
        info(`Could not find "${name}" template. Nothing will be rendered`, {
          fullName: `template:${name}`,
        });
      }
    }
    const template = route._topLevelViewTemplate(owner);
    invokable = makeRouteTemplate(owner, name, template as Template);
  }
  return invokable;
}
