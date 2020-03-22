import { Factory } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { assign } from '@ember/polyfills';
import { Option } from '@glimmer/interfaces';
import { MatchCallback } from 'route-recognizer';
import { EngineInfo, EngineRouteInfo } from './engines';

let uuid = 0;

export interface RouteOptions {
  path?: string;
  resetNamespace?: boolean;
  serialize?: any;
  overrideNameAssertion?: boolean;
}

export interface MountOptions {
  path?: string;
  as?: string;
  resetNamespace?: boolean;
}

export interface DSLCallback {
  (this: DSL): void;
}

export interface DSL {
  route(name: string): void;
  route(name: string, callback: DSLCallback): void;
  route(name: string, options: RouteOptions): void;
  route(name: string, options: RouteOptions, callback: DSLCallback): void;

  mount(name: string): void;
  mount(name: string, options: MountOptions): void;
}

function isCallback(value?: RouteOptions | DSLCallback): value is DSLCallback {
  return typeof value === 'function';
}

function isOptions(value?: RouteOptions | DSLCallback): value is RouteOptions {
  return value !== null && typeof value === 'object';
}
export interface DSLImplOptions {
  enableLoadingSubstates: boolean;
  overrideNameAssertion?: boolean;
  engineInfo?: EngineInfo;
  addRouteForEngine(name: string, routeOptions: EngineRouteInfo): void;
  resolveRouteMap(name: string): Factory<any, any>;
  path?: string;
}

export default class DSLImpl implements DSL {
  parent: string | null;
  matches: any[];
  enableLoadingSubstates: boolean;
  explicitIndex = false;
  options: DSLImplOptions;

  constructor(name: string | null = null, options: DSLImplOptions) {
    this.parent = name;
    this.enableLoadingSubstates = Boolean(options && options.enableLoadingSubstates);
    this.matches = [];
    this.options = options;
  }

  /* eslint-disable no-dupe-class-members */
  route(name: string): void;
  route(name: string, callback: DSLCallback): void;
  route(name: string, options: RouteOptions): void;
  route(name: string, options: RouteOptions, callback: DSLCallback): void;
  route(name: string, _options?: RouteOptions | DSLCallback, _callback?: DSLCallback) {
    let options: RouteOptions;
    let callback: Option<DSLCallback> = null;

    let dummyErrorRoute = `/_unused_dummy_error_path_route_${name}/:error`;
    if (isCallback(_options)) {
      assert('Unexpected arguments', arguments.length === 2);
      options = {};
      callback = _options;
    } else if (isCallback(_callback)) {
      assert('Unexpected arguments', arguments.length === 3);
      assert('Unexpected arguments', isOptions(_options));
      options = _options as RouteOptions;
      callback = _callback;
    } else {
      options = _options || {};
    }

    assert(
      `'${name}' cannot be used as a route name.`,
      (() => {
        if (options.overrideNameAssertion === true) {
          return true;
        }

        return ['basic', 'application'].indexOf(name) === -1;
      })()
    );

    assert(
      `'${name}' is not a valid route name. It cannot contain a ':'. You may want to use the 'path' option instead.`,
      name.indexOf(':') === -1
    );

    if (this.enableLoadingSubstates) {
      createRoute(this, `${name}_loading`, {
        resetNamespace: options.resetNamespace,
      });
      createRoute(this, `${name}_error`, {
        resetNamespace: options.resetNamespace,
        path: dummyErrorRoute,
      });
    }

    if (callback) {
      let fullName = getFullName(this, name, options.resetNamespace);
      let dsl = new DSLImpl(fullName, this.options);

      createRoute(dsl, 'loading');
      createRoute(dsl, 'error', { path: dummyErrorRoute });

      callback.call(dsl);

      createRoute(this, name, options, dsl.generate());
    } else {
      createRoute(this, name, options);
    }
  }
  /* eslint-enable no-dupe-class-members */

  push(url: string, name: string, callback?: MatchCallback, serialize?: any) {
    let parts = name.split('.');

    if (this.options.engineInfo) {
      let localFullName = name.slice(this.options.engineInfo.fullName.length + 1);
      let routeInfo: EngineRouteInfo = assign({ localFullName }, this.options.engineInfo);

      if (serialize) {
        routeInfo.serializeMethod = serialize;
      }

      this.options.addRouteForEngine(name, routeInfo);
    } else if (serialize) {
      throw new Error(
        `Defining a route serializer on route '${name}' outside an Engine is not allowed.`
      );
    }

    if (url === '' || url === '/' || parts[parts.length - 1] === 'index') {
      this.explicitIndex = true;
    }

    this.matches.push(url, name, callback);
  }

  generate(): MatchCallback {
    let dslMatches = this.matches;

    if (!this.explicitIndex) {
      this.route('index', { path: '/' });
    }

    return match => {
      for (let i = 0; i < dslMatches.length; i += 3) {
        match(dslMatches[i]).to(dslMatches[i + 1], dslMatches[i + 2]);
      }
    };
  }

  mount(_name: string, options: MountOptions = {}) {
    let engineRouteMap = this.options.resolveRouteMap(_name);
    let name = _name;

    if (options.as) {
      name = options.as;
    }

    let fullName = getFullName(this, name, options.resetNamespace);

    let engineInfo: EngineInfo = {
      name: _name,
      instanceId: uuid++,
      mountPoint: fullName,
      fullName,
    };

    let path = options.path;

    if (typeof path !== 'string') {
      path = `/${name}`;
    }

    let callback;
    let dummyErrorRoute = `/_unused_dummy_error_path_route_${name}/:error`;
    if (engineRouteMap) {
      let shouldResetEngineInfo = false;
      let oldEngineInfo = this.options.engineInfo;
      if (oldEngineInfo) {
        shouldResetEngineInfo = true;
        this.options.engineInfo = engineInfo;
      }

      let optionsForChild = assign({ engineInfo }, this.options);
      let childDSL = new DSLImpl(fullName, optionsForChild);

      createRoute(childDSL, 'loading');
      createRoute(childDSL, 'error', { path: dummyErrorRoute });

      engineRouteMap.class.call(childDSL);

      callback = childDSL.generate();

      if (shouldResetEngineInfo) {
        this.options.engineInfo = oldEngineInfo;
      }
    }

    let localFullName = 'application';
    let routeInfo = assign({ localFullName }, engineInfo);

    if (this.enableLoadingSubstates) {
      // These values are important to register the loading routes under their
      // proper names for the Router and within the Engine's registry.
      let substateName = `${name}_loading`;
      let localFullName = `application_loading`;
      let routeInfo = assign({ localFullName }, engineInfo);
      createRoute(this, substateName, {
        resetNamespace: options.resetNamespace,
      });
      this.options.addRouteForEngine(substateName, routeInfo);

      substateName = `${name}_error`;
      localFullName = `application_error`;
      routeInfo = assign({ localFullName }, engineInfo);
      createRoute(this, substateName, {
        resetNamespace: options.resetNamespace,
        path: dummyErrorRoute,
      });
      this.options.addRouteForEngine(substateName, routeInfo);
    }

    this.options.addRouteForEngine(fullName, routeInfo);

    this.push(path, fullName, callback);
  }
}

function canNest(dsl: DSLImpl) {
  return dsl.parent !== 'application';
}

function getFullName(dsl: DSLImpl, name: string, resetNamespace?: boolean) {
  if (canNest(dsl) && resetNamespace !== true) {
    return `${dsl.parent}.${name}`;
  } else {
    return name;
  }
}

function createRoute(
  dsl: DSLImpl,
  name: string,
  options: RouteOptions = {},
  callback?: MatchCallback
) {
  let fullName = getFullName(dsl, name, options.resetNamespace);

  if (typeof options.path !== 'string') {
    options.path = `/${name}`;
  }

  dsl.push(options.path, fullName, callback, options.serialize);
}
