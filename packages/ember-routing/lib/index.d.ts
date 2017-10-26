export const Location: {
  create(options: any): any
};

export const NoneLocation: {
  implementation: string;
  path: string;
  detect(): void;
  rootURL: string;
  getURL(): string;
  setURL(path: string): void;
  onUpdateURL(callback: ()=>any): void;
  handleURL(url: string): void;
  formatURL(url: string): string;
};

export const HashLocation: {
  implementation: string;
  init(): void;
  getHash(location: { href: string }): string;
  getURL(): string;
  setURL(path: string): void;
  replaceURL(path: string): void;
  onUpdateURL(callback: ()=>any): void;
  formatURL(url: string): string;
  willDestroy(): void;
  _removeEventListener(): void;
};

export const HistoryLocation: {
  implementation: string;
  init(): void;
  initState(): void;
  rootURL: string;
  getURL(): string;
  setURL(path: string): void;
  replaceURL(path: string): void;
  getState(): any;
  pushState(path: string): void;
  replaceState(paht: string): void;
  onUpdateURL(callback: ()=>any): void;
  formatURL(url: string): string;
  willDestroy(): void;
  getHash(location: { href: string }): string;
  _removeEventListener(): void;
};

export const AutoLocation: {
  location: string | any;
  history: any;
  global: any;
  userAgent: any;
  cancelRouterSetup: boolean;
  rootURL: string;
  detect(): void;
  initState(): void;
  getURL(): string;
  setURL(path: string): void;
  replaceURL(path: string): void;
  onUpdateURL(callback: ()=>any): void;
  formatURL(url: string): string;
  willDestroy(): void;
};

export function generateController(owner: any, controllerName: string): any;
export function generateControllerFactory(owner: any, controllerName: string, context: any): any;

export function controllerFor(container: any, controllerName: string, lookupOptions: any): any;

export class RouterDSL {
  constructor(name: string, options: any);
  route(name: string, options: any, callback: ()=>any): void;
  push(url: string, name: string, callback: ()=>any, serialize: ()=>any): void;
  resource(name: string, options: any, callback: ()=>any): void;
  genearte(): (match: any) => void;
  mount(_name: string, options: any): void;
}

export const Router: {
  location: string;
  rootURL: string;
  currentState: any;
  targetState: any;
  _initRouterJs(): void;
  _buildDSL(): RouterDSL;
  init(): void;
  _resetQueuedQueryParameterChanges(): void;
  url: string;
  _hasModuleBasedResolver(): boolean;
  startRouting(): void;
  setupRouter(): boolean;
  didTransition(infos: any): void;
  _setOutlets(): void;
  willTransition(oldInfos: any, newInfos: any, transition: any): void;
  handleURL(url: string): any;
  _doURLTransition(routerJsMethod: ()=>any, url: string): any;
  transitionTo(...args: any[]): any;
  intermediateTransitionTo(...args: any[]): void;
  replaceWith(): any;
  generate(): string;
  isActive(...args: any[]): boolean;
  isActiveIntent(routeName: string, models: any, queryParams: any): boolean;
  send(): void;
  hasRoute(route: any): boolean;
  reset(): void;
  willDestroy(): void;
  _activeQPChanged(queryParameterName: string, newValue: string): void;
  _updatingQPChanged(queryParameterName: string): void;
  _fireQueryParamTransition(): void;
  _setupLocation(): void;
  _getHandlerFunction(): (name: string) => any;
  _getSerializerFunction(): (name: string) => any;
  _setupRouter(location: any): void;
  _serializeQueryParams(handlerInfos: any[], queryParams: any): void;
  _serializeQueryParam(value: any, type: string): string;
  _deserializeQueryParams(handlerInfos: any[], queryParams: any): void;
  _deserializeQueryParam(value: any, defaultType: string): any;
  _pruneDefaultQueryParamValues(handlerInfos: any[], queryParams: any): void;
  _doTransition(_targetRouteName: string, models: any[], _queryParams: any, _keepDefaultQueryParamValues: any): any;
  _processActiveTransitionQueryParams(targetRouteName: any, models: any[], queryParams: any, _queryParams: any): void;
  _prepareQueryParams(targetRouteName: string, models: any[], queryParams: any, _fromRouterService: any): void;
  _getQPMeta(handlerInfo: any): any;
  _queryParamsFor(handlerInfos: any[]): any;
  _fullyScopeQueryParams(leafRouteName: string, contexts: any[], queryParams: any): void;
  _hydrateUnsuppliedQueryParams(state: any, queryParams: any, _fromRouterService: any): void;
  _scheduleLoadingEvent(transition: any, originRoute: any): void;
  _handleSlowTransition(transition: any, originRoute: any): void;
  _cancelSlowTransitionTimer(): void;
  _markErrorAsHandled(errorGuid: string): void;
  _isErrorHandled(errorGuid: string): boolean;
  _clearHandledError(errorGuid: string): void;
  _getEngineInstance({ name, instanceId, mountPoint }: any): any;
  map(callback: ()=>any): any;
  _routePath(handlerInfos: any[]): string;
};

export const Route: {
  queryParams: any;
  _setRouteName(name: string): void;
  _qp: any;
  _names: any[];
  _stashNames(handlerInfo: any, dynamicParent: any): void;
  _activeQPChanged(qp: any, value: any): void;
  _updatingQPChanged(qp: any): void;
  mergedProperties: string[];
  paramsFor(name: string): any;
  serializeQueryParamKey(controllerPropertyName: string): string;
  serializeQueryParam(value: any, urlKey: string, defaultValueType: string): string;
  deserializeQueryParam(value: any, urlKey: string, defaultValueType: string): any;
  _optionsForQueryParam(qp: any): any;
  resetController(controller: any, isExiting: boolean, transition: any): void;
  exit(): void;
  _reset(isExiting: boolean, transition: any): void;
  enter(): void;
  templateName: string;
  controllerName: string;
  actions: {
    queryParamsDidChange(changed: any, totalPresent: any, removed: any): boolean;
    finalizeQueryParamChange(params: any, finalParams: any, transition: any): void;
  };
  deactivate(): void;
  activate(): void;
  transitionTo(name: string, context: any): any;
  intermediateTransitionTo(): void;
  refresh(): any;
  replaceWith(): any;
  send(...args: any[]): any;
  setup(context: any, transition: any): void;
  _qpChanged(prop: any, value: any, qp: any): void;
  beforeModel(): any;
  afterModel(): any;
  redirect(): any;
  contextDidChange(): void;
  model(params: any, transition: any): any;
  deserialize(params: any, transition: any): any;
  findModel(): any;
  store: any;
  serialize(model: any, params: any[]): any;
  setupController(controller: any, context: any, transition: any): void;
  controllerFor(name: string, _skipAssert: boolean): any;
  generateController(name: string): any;
  modelFor(_name: string): any;
  renderTemplate(controller: any, model: any): void;
  render(_name: string, options: {
    into: string,
    outlet: string,
    controller: string | any,
    model: any
  }): void;
  disconnectOutlet(options: any): void;
  _disconnectOutlet(outletName: any, parentView: any): void;
  willDestroy(): void;
  teardownViews(): void;
  isRouteFactory: boolean;
};
export const QueryParams: {
  isQueryParams: boolean;
  values: any
}; 
export const RoutingService: {
  router: any;
  targetState: any;
  currentState: any;
  currentRouteName: string;
  currentPath: string;
  hasRoute(routeName: string): boolean;
  transitionTo(routeName: string, models: any, queryParams: any, shouldReplace: boolean): any;
  normalizeQueryParams(routeName: string, models: any, queryParams: any): void;
  generateURL(routeName: string, models: any, queryParams: any): any;
  isActiveForRoute(contexts: any, queryParams: any, routeName: string, routerState: any, isCurrentWhenSpecified: boolean): boolean;
};
export const RouterService: {
  currentRouteName: string;
  currentURL: string;
  location: any;
  rootURL: string;
  _router: any;
  transitionTo(...args: any[]): any;
  replaceWith(...args: any[]): any;
  urlFor(...args: any[]): string;
  isActive(...args: any[]): boolean;
  _extractArguments(routeName: string, ...models: any[]): {routeName: string, models: any[], queryParams: any};
};
export const BucketCache: {
  init(): void;
  has(bucketKey: string): boolean;
  stash(bucketKey: string, key: string, value: any): void;
  lookup(bucketKey: string, prop: any, defaultValue: any): any;
};
