/* eslint-disable no-prototype-builtins */
import { Promise } from 'rsvp';
import type { Dict, Option } from './core';
import type { SerializerFunc } from './router';
import type Router from './router';
import type InternalTransition from './transition';
import {
  isTransition,
  PARAMS_SYMBOL,
  type PublicTransition as Transition,
  QUERY_PARAMS_SYMBOL,
  STATE_SYMBOL,
} from './transition';
import { isParam, isPromise, merge } from './utils';
import { throwIfAborted } from './transition-aborted-error';
import type { EnterState, RouteManager, RouteStateBucket } from './route-manager';
import { getManagedRoute, hasClassicInterop } from './route-manager';

export type IModel = {} & {
  id?: string | number;
};

export type ModelFor<T> = T extends BaseRoute<infer V> ? V : never;

export interface BaseRoute<T = unknown> {
  context: T | undefined;

  // this is used to identify the route in router_js machinery, and is not the same as the
  // routeName property on classic ember routes. It is totally internal to router_js, and
  // not to be confused with the routeName property on classic ember routes
  _internalName?: string;

  // I think this could potentially be deleted
  // it's not mentioned in any ember docs that I can find, and is only
  // used in a couple of places in router_js
  inaccessibleByURL?: boolean;
}

// used by old router_js tests that expect to be working with the classic ember routes
export interface ClassicRoute<T = unknown> extends BaseRoute<T> {
  routeName: string;
  events?: Dict<(...args: unknown[]) => unknown>;
  model?(params: Dict<unknown>, transition: Transition): PromiseLike<T> | undefined | T;
  deserialize?(params: Dict<unknown>, transition: Transition): T | PromiseLike<T> | undefined;
  serialize?(model: T | undefined, params: string[]): Dict<unknown> | undefined;
  beforeModel?(transition: Transition): PromiseLike<any> | any;
  afterModel?(resolvedModel: T | undefined, transition: Transition): PromiseLike<any> | any;
  setup?(context: T | undefined, transition: Transition): void;
  enter?(transition: Transition): void;
  exit?(transition?: Transition): void;
  _internalReset?(wasReset: boolean, transition?: Transition): void;
  contextDidChange?(): void;
  redirect?(context: T | undefined, transition: Transition): void;
  buildRouteInfoMetadata?(): unknown;
}

export interface RouteInfo {
  readonly name: string;
  readonly parent: RouteInfo | RouteInfoWithAttributes | null;
  readonly child: RouteInfo | RouteInfoWithAttributes | null;
  readonly localName: string;
  readonly params: Dict<unknown> | undefined;
  readonly paramNames: string[];
  readonly queryParams: Dict<unknown>;
  readonly metadata: unknown;
  find(
    predicate: (this: any, routeInfo: RouteInfo, i: number) => boolean,
    thisArg?: any
  ): RouteInfo | undefined;
}

export interface RouteInfoWithAttributes extends RouteInfo {
  attributes: any;
}

type RouteInfosKey = InternalRouteInfo<BaseRoute>;

let ROUTE_INFOS = new WeakMap<RouteInfosKey, RouteInfo | RouteInfoWithAttributes>();

export function toReadOnlyRouteInfo<R extends BaseRoute>(
  routeInfos: InternalRouteInfo<R>[],
  queryParams: Dict<unknown> = {},
  options: {
    includeAttributes?: boolean;
    localizeMapUpdates?: boolean;
  } = { includeAttributes: false, localizeMapUpdates: false }
): RouteInfoWithAttributes[] | RouteInfo[] {
  const LOCAL_ROUTE_INFOS = new WeakMap<RouteInfosKey, RouteInfo | RouteInfoWithAttributes>();

  return routeInfos.map((info, i) => {
    let { name, params, paramNames, context } = info;
    // SAFETY: This should be safe since it is just for use as a key
    let key = info as unknown as RouteInfosKey;
    if (ROUTE_INFOS.has(key) && options.includeAttributes) {
      let routeInfo = ROUTE_INFOS.get(key)!;
      routeInfo = attachMetadata(info, routeInfo);
      let routeInfoWithAttribute = createRouteInfoWithAttributes(routeInfo, context);
      LOCAL_ROUTE_INFOS.set(key, routeInfo);
      if (!options.localizeMapUpdates) {
        ROUTE_INFOS.set(key, routeInfoWithAttribute);
      }
      return routeInfoWithAttribute as RouteInfoWithAttributes;
    }

    const routeInfosRef = options.localizeMapUpdates ? LOCAL_ROUTE_INFOS : ROUTE_INFOS;

    let routeInfo: RouteInfo = {
      find(
        predicate: (this: any, routeInfo: RouteInfo, i: number, arr?: RouteInfo[]) => boolean,
        thisArg: any
      ) {
        let publicInfo;
        let arr: RouteInfo[] = [];

        if (predicate.length === 3) {
          arr = routeInfos.map(
            // SAFETY: This should be safe since it is just for use as a key
            (info) => routeInfosRef.get(info as unknown as RouteInfosKey)!
          );
        }

        for (let i = 0; routeInfos.length > i; i++) {
          // SAFETY: This should be safe since it is just for use as a key
          publicInfo = routeInfosRef.get(routeInfos[i] as unknown as RouteInfosKey)!;
          if (predicate.call(thisArg, publicInfo, i, arr)) {
            return publicInfo;
          }
        }

        return undefined;
      },

      get name() {
        return name;
      },

      get paramNames() {
        return paramNames;
      },

      get metadata() {
        return buildRouteInfoMetadata(info);
      },

      get parent() {
        let parent = routeInfos[i - 1];

        if (parent === undefined) {
          return null;
        }

        // SAFETY: This should be safe since it is just for use as a key
        return routeInfosRef.get(parent as unknown as RouteInfosKey)!;
      },

      get child() {
        let child = routeInfos[i + 1];

        if (child === undefined) {
          return null;
        }

        // SAFETY: This should be safe since it is just for use as a key
        return routeInfosRef.get(child as unknown as RouteInfosKey)!;
      },

      get localName() {
        let parts = this.name.split('.');
        return parts[parts.length - 1]!;
      },

      get params() {
        return params;
      },

      get queryParams() {
        return queryParams;
      },
    };

    if (options.includeAttributes) {
      routeInfo = createRouteInfoWithAttributes(routeInfo, context);
    }

    // SAFETY: This should be safe since it is just for use as a key
    LOCAL_ROUTE_INFOS.set(info as unknown as RouteInfosKey, routeInfo);

    if (!options.localizeMapUpdates) {
      // SAFETY: This should be safe since it is just for use as a key
      ROUTE_INFOS.set(info as unknown as RouteInfosKey, routeInfo);
    }

    return routeInfo;
  });
}

function createRouteInfoWithAttributes(
  routeInfo: RouteInfo,
  context: any
): RouteInfoWithAttributes {
  let attributes = {
    get attributes() {
      return context;
    },
  };

  if (!Object.isExtensible(routeInfo) || routeInfo.hasOwnProperty('attributes')) {
    return Object.freeze(Object.assign({}, routeInfo, attributes));
  }

  return Object.assign(routeInfo, attributes);
}

function buildRouteInfoMetadata(info: InternalRouteInfo<BaseRoute>) {
  let { manager, bucket } = info;
  if (manager !== undefined && hasClassicInterop(manager) && bucket !== undefined) {
    return manager.getRouteInfoMetadata(bucket);
  }

  return null;
}

function attachMetadata(info: InternalRouteInfo<BaseRoute>, routeInfo: RouteInfo) {
  let metadata = {
    get metadata() {
      return buildRouteInfoMetadata(info);
    },
  };

  if (!Object.isExtensible(routeInfo) || routeInfo.hasOwnProperty('metadata')) {
    return Object.freeze(Object.assign({}, routeInfo, metadata));
  }

  return Object.assign(routeInfo, metadata);
}

export default class InternalRouteInfo<R extends BaseRoute> {
  private _routePromise?: Promise<R> = undefined;
  private _route?: Option<R> = null;
  protected router: Router<R>;
  declare paramNames: string[];
  declare name: string;
  params: Dict<unknown> | undefined = {};
  declare queryParams?: Dict<unknown>;
  declare context?: ModelFor<R> | PromiseLike<ModelFor<R>> | undefined;
  isResolved = false;
  enterPromise?: globalThis.Promise<unknown> = undefined;

  constructor(router: Router<R>, name: string, paramNames: string[], route?: R) {
    this.name = name;
    this.paramNames = paramNames;
    this.router = router;
    if (route) {
      this._processRoute(route);
    }
  }

  getModel(_transition: InternalTransition<R>) {
    return Promise.resolve(this.context);
  }

  serialize(_context?: ModelFor<R> | null): Dict<unknown> | undefined {
    return this.params || {};
  }

  resolve(transition: InternalTransition<R>): Promise<ResolvedRouteInfo<R>> {
    return Promise.resolve(this.routePromise)
      .then((route: R) => {
        throwIfAborted(transition);
        return route;
      })
      .then(() => {
        const { manager, bucket } = this;
        if (manager === undefined || bucket === undefined) {
          throw new Error(
            `Route '${this.name}' has no RouteManager attached. Use \`setRouteManager\` to associate one with the route class.`
          );
        }

        // RFC NavigationState: transition-level from/to, populated by
        // routeWillChange before any lifecycle hook runs. Hand-built
        // transitions in unit tests may lack `to`; fall back to this route's
        // own public info.
        const to =
          (transition.to as RouteInfo | undefined) ??
          (ROUTE_INFOS.get(this as unknown as RouteInfosKey) as RouteInfo | undefined) ??
          (this as unknown as RouteInfo);
        const from = (transition.from ?? undefined) as RouteInfo | undefined;

        const navigationArgs: EnterState = {
          from,
          to,
          cancel: () => transition.abort(),
          signal: transition.signal,
          getAncestorContext: (ancestor: RouteInfo) => {
            const allRouteInfos = transition[STATE_SYMBOL]?.routeInfos ?? [];
            const matched = allRouteInfos.find((ri) => ri?.name === ancestor.name);
            if (!matched) return Promise.resolve(undefined);
            const ancestorEnter = matched.enterPromise ?? Promise.resolve(undefined);
            return Promise.resolve(ancestorEnter);
          },
        };

        // The raw transition and the internal route info are classic-interop
        // concerns; only provide them when the manager opts in.
        if (hasClassicInterop(manager)) {
          Object.assign(navigationArgs, { transition, internalRouteInfo: this });
        }

        manager.willEnter(bucket, navigationArgs);

        const enterPromise = manager.enter(bucket, navigationArgs);
        this.enterPromise = enterPromise;

        // Pipe the resolved model onto routeInfo.context so the outlet's @model
        // ref can pick it up.
        enterPromise.then(
          (resolvedContext) => {
            if (transition.isAborted) return;
            this.context = resolvedContext as ModelFor<R> | undefined;
          },
          () => {
            // Swallow rejections; transition-level error handling reports them.
          }
        );

        // The manager decides whether to gate getInvokable on enterPromise. The
        // classic manager does, so getInvokable rejects when enter rejects
        return manager.getInvokable(bucket, enterPromise).then(() => {
          throwIfAborted(transition);
          const resolvedContext = this.context as ModelFor<R> | undefined;
          return this.becomeResolved(transition, resolvedContext);
        });
      });
  }

  becomeResolved(
    transition: InternalTransition<R> | null,
    resolvedContext: ModelFor<R> | undefined
  ): ResolvedRouteInfo<R> {
    let params = this.serialize(resolvedContext);

    if (transition) {
      this.stashResolvedModel(transition, resolvedContext);
      transition[PARAMS_SYMBOL] = transition[PARAMS_SYMBOL] || {};
      transition[PARAMS_SYMBOL][this.name] = params;
    }

    let context;
    let contextsMatch = resolvedContext === this.context;

    if ('context' in this || !contextsMatch) {
      context = resolvedContext;
    }

    // SAFETY: Since this is just for lookup, it should be safe
    let cached = ROUTE_INFOS.get(this as unknown as InternalRouteInfo<BaseRoute>);
    let resolved = new ResolvedRouteInfo<R>(
      this.router,
      this.name,
      this.paramNames,
      params,
      this.route!,
      context,
      this.enterPromise
    );

    // Back-fill the model onto `resolved` once `enter` settles, but only for
    // managers that render before their model resolves. A manager whose
    // `getInvokable` gates on `enter` (e.g. the classic manager) reaches here
    // with `resolvedContext` already set, so `resolved` was built with its final
    // `context` and there is nothing to wait for. A manager whose `getInvokable`
    // resolves *before* `enter` (e.g. a manager which renders
    // immediately and shows a loading state) reaches here while `enterPromise`
    // is still pending and `resolvedContext` is undefined; the resolve()-level
    // `.then` only updates the now-replaced unresolved info, so this is the
    // subscription that writes the model onto the live `resolved` info (and the
    // transition's resolved models) when it finally arrives.
    if (resolvedContext === undefined && this.enterPromise !== undefined) {
      this.enterPromise.then(
        (enteredContext) => {
          if (transition && transition.isAborted) return;
          resolved.context = enteredContext as ModelFor<R> | undefined;
          if (transition) {
            transition.resolvedModels = transition.resolvedModels || {};
            transition.resolvedModels[resolved.name] = enteredContext as ModelFor<R> | undefined;
          }
        },
        () => {
          // enter rejected; transition-level error handling reports it.
        }
      );
    }

    if (cached !== undefined) {
      // SAFETY: This is potentially a bit risker, but for what we're doing, it should be ok.
      ROUTE_INFOS.set(resolved as unknown as InternalRouteInfo<BaseRoute>, cached);
    }

    return resolved;
  }

  shouldSupersede(routeInfo?: InternalRouteInfo<R>) {
    // Prefer this newer routeInfo over `other` if:
    // 1) The other one doesn't exist
    // 2) The names don't match
    // 3) This route has a context that doesn't match
    //    the other one (or the other one doesn't have one).
    // 4) This route has parameters that don't match the other.
    if (!routeInfo) {
      return true;
    }

    let contextsMatch = routeInfo.context === this.context;
    return (
      routeInfo.name !== this.name ||
      ('context' in this && !contextsMatch) ||
      (this.hasOwnProperty('params') && !paramsMatch(this.params, routeInfo.params))
    );
  }

  get route(): R | undefined {
    // _route could be set to either a route object or undefined, so we
    // compare against null to know when it's been set
    if (this._route !== null) {
      return this._route;
    }

    return this.fetchRoute();
  }

  /**
    The manager driving this route's lifecycle, read from the association the
    framework router registered via `associateManagedRoute` when it resolved
    the route. `undefined` until the route has loaded.
   */
  get manager(): RouteManager | undefined {
    let route = this.route;
    return route === undefined ? undefined : getManagedRoute(route)?.manager;
  }

  /** The manager's bucket for this route. `undefined` until the route has loaded. */
  get bucket(): RouteStateBucket | undefined {
    let route = this.route;
    return route === undefined ? undefined : getManagedRoute(route)?.bucket;
  }

  set route(route: R | undefined) {
    this._route = route;
  }

  get routePromise(): Promise<R> {
    if (this._routePromise) {
      return this._routePromise;
    }

    this.fetchRoute();

    return this._routePromise!;
  }

  set routePromise(routePromise: Promise<R>) {
    this._routePromise = routePromise;
  }

  protected log(transition: InternalTransition<R>, message: string) {
    if (transition.log) {
      transition.log(this.name + ': ' + message);
    }
  }

  private updateRoute(route: R) {
    route._internalName = this.name;
    return (this.route = route);
  }

  private stashResolvedModel(
    transition: InternalTransition<R>,
    resolvedModel: ModelFor<R> | undefined
  ) {
    transition.resolvedModels = transition.resolvedModels || {};
    // SAFETY: It's unfortunate that we have to do this cast. It should be safe though.
    transition.resolvedModels[this.name] = resolvedModel;
  }

  private fetchRoute() {
    let route = this.router.getRoute(this.name);
    return this._processRoute(route);
  }

  private _processRoute(route: R | Promise<R>) {
    // Setup a routePromise so that we can wait for asynchronously loaded routes
    this.routePromise = Promise.resolve(route);

    // Wait until the 'route' property has been updated when chaining to a route
    // that is a promise
    if (isPromise(route)) {
      this.routePromise = this.routePromise.then((r) => {
        return this.updateRoute(r);
      });
      // set to undefined to avoid recursive loop in the route getter
      return (this.route = undefined);
    } else if (route) {
      return this.updateRoute(route);
    }

    return undefined;
  }
}

export class ResolvedRouteInfo<R extends BaseRoute> extends InternalRouteInfo<R> {
  isResolved: boolean;
  context: ModelFor<R> | undefined;
  constructor(
    router: Router<R>,
    name: string,
    paramNames: string[],
    params: Dict<unknown> | undefined,
    route: R,
    context?: ModelFor<R>,
    enterPromise?: globalThis.Promise<unknown>
  ) {
    super(router, name, paramNames, route);
    this.params = params;
    this.isResolved = true;
    this.context = context;
    this.enterPromise = enterPromise;
  }

  resolve(transition: InternalTransition<R>): Promise<this> {
    // A ResolvedRouteInfo just resolved with itself.
    if (transition && transition.resolvedModels) {
      transition.resolvedModels[this.name] = this.context;
    }
    return Promise.resolve(this);
  }
}

export class UnresolvedRouteInfoByParam<R extends BaseRoute> extends InternalRouteInfo<R> {
  params: Dict<unknown> = {};
  constructor(
    router: Router<R>,
    name: string,
    paramNames: string[],
    params: Dict<unknown> | undefined,
    route?: R
  ) {
    super(router, name, paramNames, route);
    if (params) {
      this.params = params;
    }
  }

  getModel(transition: InternalTransition<R>): Promise<ModelFor<R>> {
    let fullParams = this.params;
    if (transition && transition[QUERY_PARAMS_SYMBOL]) {
      fullParams = {};
      merge(fullParams, this.params);
      fullParams['queryParams'] = transition[QUERY_PARAMS_SYMBOL];
    }

    let result: ModelFor<R> | PromiseLike<ModelFor<R>> | undefined;

    let { manager, bucket } = this;
    if (manager !== undefined && hasClassicInterop(manager) && bucket !== undefined) {
      result = manager.getContext(bucket, fullParams, transition) as
        | ModelFor<R>
        | PromiseLike<ModelFor<R>>
        | undefined;
    }

    if (result && isTransition(result)) {
      result = undefined;
    }

    return Promise.resolve(result);
  }
}

export class UnresolvedRouteInfoByObject<R extends BaseRoute> extends InternalRouteInfo<R> {
  serializer?: SerializerFunc<ModelFor<R>>;
  constructor(
    router: Router<R>,
    name: string,
    paramNames: string[],
    context: ModelFor<R> | PromiseLike<ModelFor<R>> | undefined
  ) {
    super(router, name, paramNames);
    this.context = context;
    this.serializer = this.router.getSerializer(name);
  }

  getModel(transition: InternalTransition<R>) {
    if (this.router.log !== undefined) {
      this.router.log(this.name + ': resolving provided model');
    }
    return super.getModel(transition);
  }

  /**
    @private

    Serializes a route using its custom `serialize` method or
    by a default that looks up the expected property name from
    the dynamic segment.

    @param {Object} model the model to be serialized for this route
  */
  serialize(model?: ModelFor<R>): Dict<unknown> | undefined {
    let { paramNames, context } = this;

    if (!model) {
      // SAFETY: By the time we serialize, we expect to be resolved.
      // This may not be an entirely safe assumption though no tests fail.
      model = context as ModelFor<R>;
    }

    let object: Dict<unknown> = {};
    if (isParam(model)) {
      object[paramNames[0]!] = model;
      return object;
    }

    // Use custom serialize if it exists.
    if (this.serializer) {
      // invoke this.serializer unbound (getSerializer returns a stateless function)
      return this.serializer.call(null, model, paramNames);
    } else {
      let { manager, bucket } = this;
      if (manager !== undefined && hasClassicInterop(manager) && bucket !== undefined) {
        return manager.serializeContext(bucket, this, model) as Dict<unknown> | undefined;
      }
    }

    if (paramNames.length !== 1) {
      return;
    }

    let name = paramNames[0]!;

    if (/_id$/.test(name)) {
      // SAFETY: Model is supposed to extend IModel already
      object[name] = (model as IModel).id;
    } else {
      object[name] = model;
    }
    return object;
  }
}

function paramsMatch(a: Dict<unknown> | undefined, b: Dict<unknown> | undefined) {
  if (a === b) {
    // Both are identical, may both be undefined
    return true;
  }

  if (!a || !b) {
    // Only one is undefined, already checked they aren't identical
    return false;
  }

  // Note: this assumes that both params have the same
  // number of keys, but since we're comparing the
  // same routes, they should.
  for (let k in a) {
    if (a.hasOwnProperty(k) && a[k] !== b[k]) {
      return false;
    }
  }
  return true;
}
