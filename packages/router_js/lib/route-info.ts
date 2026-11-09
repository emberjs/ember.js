/* eslint-disable no-prototype-builtins */
import { Promise } from 'rsvp';
import type { Dict, Option } from './core';
import type { SerializerFunc } from './router';
import type Router from './router';
import type InternalTransition from './transition';
import { isTransition, PARAMS_SYMBOL, QUERY_PARAMS_SYMBOL, STATE_SYMBOL } from './transition';
import { isParam, isPromise, merge } from './utils';
import { throwIfAborted } from './transition-aborted-error';
import type { EnterState, RouteManagement, RouteManager, RouteStateBucket } from './route-manager';
import { hasClassicInterop, invokableFor } from './route-manager';

export type IModel = {} & {
  id?: string | number;
};

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

type RouteInfosKey = InternalRouteInfo;

let ROUTE_INFOS = new WeakMap<RouteInfosKey, RouteInfo | RouteInfoWithAttributes>();

export function toReadOnlyRouteInfo<R = unknown>(
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

function buildRouteInfoMetadata<R>(info: InternalRouteInfo<R>) {
  let { manager, bucket } = info;
  if (manager !== undefined && hasClassicInterop(manager) && bucket !== undefined) {
    return manager.getRouteInfoMetadata(bucket);
  }

  return null;
}

function attachMetadata<R>(info: InternalRouteInfo<R>, routeInfo: RouteInfo) {
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

export default class InternalRouteInfo<R = unknown> {
  private _managementPromise?: Promise<RouteManagement> = undefined;
  private _management?: Option<RouteManagement> = null;
  protected router: Router<R>;
  declare paramNames: string[];
  declare name: string;
  params: Dict<unknown> | undefined = {};
  declare queryParams?: Dict<unknown>;
  declare context?: R | PromiseLike<R> | undefined;
  isResolved = false;
  enterPromise?: globalThis.Promise<unknown> = undefined;
  private beginPromise?: Promise<unknown> = undefined;
  private beginTransition?: InternalTransition<R> = undefined;

  constructor(router: Router<R>, name: string, paramNames: string[], management?: RouteManagement) {
    this.name = name;
    this.paramNames = paramNames;
    this.router = router;
    if (management) {
      this._processManagement(management);
    }
  }

  getModel(_transition: InternalTransition<R>): Promise<R | undefined> {
    return Promise.resolve(this.context);
  }

  serialize(_context?: R | null): Dict<unknown> | undefined {
    return this.params || {};
  }

  beginEnter(transition: InternalTransition<R>, eager = false): Promise<unknown> {
    if (eager) {
      const eagerManager = this._management?.manager;

      // Classic keeps the sequential walk, so its legacy timings are exact.
      if (this.isResolved || (eagerManager && hasClassicInterop(eagerManager))) {
        return Promise.resolve(undefined);
      } else if (!eagerManager) {
        // LinkTo may load routes later than direct visit navigation.
        return Promise.resolve(this.managementPromise).then(() => {
          const loadedManager = this._management?.manager;

          if (loadedManager && hasClassicInterop(loadedManager)) {
            return undefined;
          }

          return this.beginEnter(transition);
        });
      }
    }

    if (this.beginPromise !== undefined && this.beginTransition === transition) {
      return this.beginPromise;
    }

    this.beginTransition = transition;
    this.beginPromise = Promise.resolve(this.managementPromise)
      .then((management: RouteManagement) => {
        throwIfAborted(transition);
        return management;
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
          getAncestorPromise: (ancestor: RouteInfo) => {
            const routeInfos = transition[STATE_SYMBOL]?.routeInfos ?? [];
            // Only true ancestors count: searching the whole hierarchy would
            // hand a route its own (or a descendant's) pending enter promise —
            // an easy deadlock for a manager that awaits it. When this info
            // isn't in the transition state (hand-built test transitions),
            // fall back to searching the full list.
            const selfIndex = routeInfos.indexOf(this);
            const ancestors = selfIndex === -1 ? routeInfos : routeInfos.slice(0, selfIndex);
            const matched = ancestors.find((ri) => ri?.name === ancestor.name);
            return matched?.enterPromise ?? Promise.resolve(undefined);
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

        const invokablePromise = Promise.resolve(invokableFor(manager, bucket));

        return Promise.all([enterPromise, invokablePromise]).then(([enteredContext]) => {
          return enteredContext;
        });
      });

    return this.beginPromise;
  }

  resolve(transition: InternalTransition<R>): Promise<ResolvedRouteInfo<R>> {
    return this.beginEnter(transition).then((enteredContext) => {
      throwIfAborted(transition);

      return this.becomeResolved(transition, enteredContext as R | undefined);
    });
  }

  becomeResolved(
    transition: InternalTransition<R> | null,
    resolvedContext: R | undefined
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
    let cached = ROUTE_INFOS.get(this as unknown as InternalRouteInfo);
    let resolved = new ResolvedRouteInfo<R>(
      this.router,
      this.name,
      this.paramNames,
      params,
      this.management!,
      context,
      this.enterPromise
    );

    if (cached !== undefined) {
      // SAFETY: This is potentially a bit risker, but for what we're doing, it should be ok.
      ROUTE_INFOS.set(resolved as unknown as InternalRouteInfo, cached);
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

  get management(): RouteManagement | undefined {
    // _management could be set to either a management pair or undefined, so we
    // compare against null to know when it's been set
    if (this._management !== null) {
      return this._management;
    }

    return this.fetchManagement();
  }

  set management(management: RouteManagement | undefined) {
    this._management = management;
  }

  get hasResolvedManagement(): boolean {
    return this._management !== null && this._management !== undefined;
  }

  get manager(): RouteManager | undefined {
    return this.management?.manager;
  }

  get bucket(): RouteStateBucket | undefined {
    return this.management?.bucket;
  }

  get inaccessibleByURL(): boolean {
    return this.router.isRouteInaccessibleByURL(this.name);
  }

  get managementPromise(): Promise<RouteManagement> {
    if (this._managementPromise) {
      return this._managementPromise;
    }

    this.fetchManagement();

    return this._managementPromise!;
  }

  set managementPromise(managementPromise: Promise<RouteManagement>) {
    this._managementPromise = managementPromise;
  }

  protected log(transition: InternalTransition<R>, message: string) {
    if (transition.log) {
      transition.log(this.name + ': ' + message);
    }
  }

  private stashResolvedModel(transition: InternalTransition<R>, resolvedModel: R | undefined) {
    transition.resolvedModels = transition.resolvedModels || {};
    // SAFETY: It's unfortunate that we have to do this cast. It should be safe though.
    transition.resolvedModels[this.name] = resolvedModel;
  }

  private fetchManagement() {
    let management = this.router.getRoute(this.name);
    return this._processManagement(management);
  }

  private _processManagement(management: RouteManagement | Promise<RouteManagement>) {
    // Setup a managementPromise so that we can wait for asynchronously loaded routes
    this.managementPromise = Promise.resolve(management);

    // Wait until the 'management' property has been updated when chaining to a
    // route that is a promise
    if (isPromise(management)) {
      this.managementPromise = this.managementPromise.then((m) => {
        this.management = m;
        return m;
      });
      // set to undefined to avoid recursive loop in the management getter
      this.management = undefined;
      return undefined;
    } else if (management) {
      this.management = management;
      return management;
    }

    return undefined;
  }
}

export class ResolvedRouteInfo<R = unknown> extends InternalRouteInfo<R> {
  isResolved: boolean;
  context: R | undefined;
  constructor(
    router: Router<R>,
    name: string,
    paramNames: string[],
    params: Dict<unknown> | undefined,
    management: RouteManagement,
    context?: R,
    enterPromise?: globalThis.Promise<unknown>
  ) {
    super(router, name, paramNames, management);
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

export class UnresolvedRouteInfoByParam<R = unknown> extends InternalRouteInfo<R> {
  params: Dict<unknown> = {};
  constructor(
    router: Router<R>,
    name: string,
    paramNames: string[],
    params: Dict<unknown> | undefined,
    management?: RouteManagement
  ) {
    super(router, name, paramNames, management);
    if (params) {
      this.params = params;
    }
  }

  getModel(transition: InternalTransition<R>): Promise<R | undefined> {
    let fullParams = this.params;
    if (transition && transition[QUERY_PARAMS_SYMBOL]) {
      fullParams = {};
      merge(fullParams, this.params);
      fullParams['queryParams'] = transition[QUERY_PARAMS_SYMBOL];
    }

    let result: R | PromiseLike<R> | undefined;

    let { manager, bucket } = this;
    if (manager !== undefined && hasClassicInterop(manager) && bucket !== undefined) {
      result = manager.getContext(bucket, fullParams, transition) as R | PromiseLike<R> | undefined;
    }

    if (result && isTransition(result)) {
      result = undefined;
    }

    return Promise.resolve(result);
  }
}

export class UnresolvedRouteInfoByObject<R = unknown> extends InternalRouteInfo<R> {
  serializer?: SerializerFunc<R>;
  constructor(
    router: Router<R>,
    name: string,
    paramNames: string[],
    context: R | PromiseLike<R> | undefined
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
  serialize(model?: R): Dict<unknown> | undefined {
    let { paramNames, context } = this;

    if (!model) {
      // SAFETY: By the time we serialize, we expect to be resolved.
      // This may not be an entirely safe assumption though no tests fail.
      model = context as R;
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
