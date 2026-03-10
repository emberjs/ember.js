import { Promise } from 'rsvp';
import { Dict, Option } from './core';
import Router, { SerializerFunc } from './router';
import InternalTransition, {
  isTransition,
  PARAMS_SYMBOL,
  prepareResult,
  PublicTransition as Transition,
  QUERY_PARAMS_SYMBOL,
} from './transition';
import { isParam, isPromise, merge } from './utils';
import { throwIfAborted } from './transition-aborted-error';

export type IModel = {} & {
  id?: string | number;
};

export type ModelFor<T> = T extends Route<infer V> ? V : never;

export interface Route<T = unknown> {
  inaccessibleByURL?: boolean;
  routeName: string;
  _internalName: string;
  context: T | undefined;
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

type RouteInfosKey = InternalRouteInfo<Route>;

let ROUTE_INFOS = new WeakMap<RouteInfosKey, RouteInfo | RouteInfoWithAttributes>();

export function toReadOnlyRouteInfo<R extends Route>(
  routeInfos: InternalRouteInfo<R>[],
  queryParams: Dict<unknown> = {},
  options: {
    includeAttributes?: boolean;
    localizeMapUpdates?: boolean;
  } = { includeAttributes: false, localizeMapUpdates: false }
): RouteInfoWithAttributes[] | RouteInfo[] {
  const LOCAL_ROUTE_INFOS = new WeakMap<RouteInfosKey, RouteInfo | RouteInfoWithAttributes>();

  return routeInfos.map((info, i) => {
    let { name, params, paramNames, context, route } = info;
    // SAFETY: This should be safe since it is just for use as a key
    let key = (info as unknown) as RouteInfosKey;
    if (ROUTE_INFOS.has(key) && options.includeAttributes) {
      let routeInfo = ROUTE_INFOS.get(key)!;
      routeInfo = attachMetadata(route!, routeInfo);
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
            (info) => routeInfosRef.get((info as unknown) as RouteInfosKey)!
          );
        }

        for (let i = 0; routeInfos.length > i; i++) {
          // SAFETY: This should be safe since it is just for use as a key
          publicInfo = routeInfosRef.get((routeInfos[i] as unknown) as RouteInfosKey)!;
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
        return buildRouteInfoMetadata(info.route);
      },

      get parent() {
        let parent = routeInfos[i - 1];

        if (parent === undefined) {
          return null;
        }

        // SAFETY: This should be safe since it is just for use as a key
        return routeInfosRef.get((parent as unknown) as RouteInfosKey)!;
      },

      get child() {
        let child = routeInfos[i + 1];

        if (child === undefined) {
          return null;
        }

        // SAFETY: This should be safe since it is just for use as a key
        return routeInfosRef.get((child as unknown) as RouteInfosKey)!;
      },

      get localName() {
        let parts = this.name.split('.');
        return parts[parts.length - 1];
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
    LOCAL_ROUTE_INFOS.set((info as unknown) as RouteInfosKey, routeInfo);

    if (!options.localizeMapUpdates) {
      // SAFETY: This should be safe since it is just for use as a key
      ROUTE_INFOS.set((info as unknown) as RouteInfosKey, routeInfo);
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

function buildRouteInfoMetadata(route?: Route) {
  if (route !== undefined && route !== null && route.buildRouteInfoMetadata !== undefined) {
    return route.buildRouteInfoMetadata();
  }

  return null;
}

function attachMetadata(route: Route, routeInfo: RouteInfo) {
  let metadata = {
    get metadata() {
      return buildRouteInfoMetadata(route);
    },
  };

  if (!Object.isExtensible(routeInfo) || routeInfo.hasOwnProperty('metadata')) {
    return Object.freeze(Object.assign({}, routeInfo, metadata));
  }

  return Object.assign(routeInfo, metadata);
}

export default class InternalRouteInfo<R extends Route> {
  private _routePromise?: Promise<R> = undefined;
  private _route?: Option<R> = null;
  protected router: Router<R>;
  paramNames: string[];
  name: string;
  params: Dict<unknown> | undefined = {};
  queryParams?: Dict<unknown>;
  context?: ModelFor<R> | PromiseLike<ModelFor<R>> | undefined;
  isResolved = false;

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
      .then((route: Route) => {
        throwIfAborted(transition);
        return route;
      })
      .then(() => this.runBeforeModelHook(transition))
      .then(() => throwIfAborted(transition))
      .then(() => this.getModel(transition))
      .then((resolvedModel) => {
        throwIfAborted(transition);
        return resolvedModel;
      })
      .then((resolvedModel) => this.runAfterModelHook(transition, resolvedModel))
      .then((resolvedModel) => this.becomeResolved(transition, resolvedModel));
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
    let cached = ROUTE_INFOS.get((this as unknown) as InternalRouteInfo<Route>);
    let resolved = new ResolvedRouteInfo<R>(
      this.router,
      this.name,
      this.paramNames,
      params,
      this.route!,
      context
    );

    if (cached !== undefined) {
      // SAFETY: This is potentially a bit risker, but for what we're doing, it should be ok.
      ROUTE_INFOS.set((resolved as unknown) as InternalRouteInfo<Route>, cached);
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

  private runBeforeModelHook(transition: InternalTransition<R>) {
    if (transition.trigger) {
      transition.trigger(true, 'willResolveModel', transition, this.route);
    }

    let result;
    if (this.route) {
      if (this.route.beforeModel !== undefined) {
        result = this.route.beforeModel(transition);
      }
    }

    if (isTransition(result)) {
      result = null;
    }

    return Promise.resolve(result);
  }

  private runAfterModelHook(
    transition: InternalTransition<R>,
    resolvedModel?: ModelFor<R> | null
  ): Promise<ModelFor<R>> {
    // Stash the resolved model on the payload.
    // This makes it possible for users to swap out
    // the resolved model in afterModel.
    let name = this.name;
    this.stashResolvedModel(transition, resolvedModel!);

    let result;
    if (this.route !== undefined) {
      if (this.route.afterModel !== undefined) {
        result = this.route.afterModel(resolvedModel!, transition);
      }
    }

    result = prepareResult(result);

    return Promise.resolve(result).then(() => {
      // Ignore the fulfilled value returned from afterModel.
      // Return the value stashed in resolvedModels, which
      // might have been swapped out in afterModel.
      // SAFTEY: We expect this to be of type T, though typing it as such is challenging.
      return (transition.resolvedModels[name]! as unknown) as ModelFor<R>;
    });
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

export class ResolvedRouteInfo<R extends Route> extends InternalRouteInfo<R> {
  isResolved: boolean;
  context: ModelFor<R> | undefined;
  constructor(
    router: Router<R>,
    name: string,
    paramNames: string[],
    params: Dict<unknown> | undefined,
    route: R,
    context?: ModelFor<R>
  ) {
    super(router, name, paramNames, route);
    this.params = params;
    this.isResolved = true;
    this.context = context;
  }

  resolve(transition: InternalTransition<R>): Promise<this> {
    // A ResolvedRouteInfo just resolved with itself.
    if (transition && transition.resolvedModels) {
      transition.resolvedModels[this.name] = this.context;
    }
    return Promise.resolve(this);
  }
}

export class UnresolvedRouteInfoByParam<R extends Route> extends InternalRouteInfo<R> {
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

  getModel(transition: InternalTransition<R>): Promise<ModelFor<R> | undefined> {
    let fullParams = this.params;
    if (transition && transition[QUERY_PARAMS_SYMBOL]) {
      fullParams = {};
      merge(fullParams, this.params);
      fullParams.queryParams = transition[QUERY_PARAMS_SYMBOL];
    }

    let route = this.route!;

    let result: ModelFor<R> | PromiseLike<ModelFor<R>> | undefined;

    // FIXME: Review these casts
    if (route.deserialize) {
      result = route.deserialize(fullParams, transition) as
        | ModelFor<R>
        | PromiseLike<ModelFor<R>>
        | undefined;
    } else if (route.model) {
      result = route.model(fullParams, transition) as
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

export class UnresolvedRouteInfoByObject<R extends Route> extends InternalRouteInfo<R> {
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
      object[paramNames[0]] = model;
      return object;
    }

    // Use custom serialize if it exists.
    if (this.serializer) {
      // invoke this.serializer unbound (getSerializer returns a stateless function)
      return this.serializer.call(null, model, paramNames);
    } else if (this.route !== undefined) {
      if (this.route.serialize) {
        return this.route.serialize(model, paramNames);
      }
    }

    if (paramNames.length !== 1) {
      return;
    }

    let name = paramNames[0];

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
