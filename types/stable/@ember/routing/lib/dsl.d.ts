declare module '@ember/routing/lib/dsl' {
  import type { InternalFactory } from '@ember/-internals/owner';
  import type { MatchCallback } from 'route-recognizer';
  import type { EngineInfo, EngineRouteInfo } from '@ember/routing/lib/engines';
  export interface RouteOptions {
    path?: string;
    resetNamespace?: boolean;
    serialize?: (
      model: {},
      params: string[]
    ) => {
      [key: string]: unknown | undefined;
    };
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
  export interface DSLImplOptions {
    enableLoadingSubstates: boolean;
    engineInfo?: EngineInfo;
    addRouteForEngine(name: string, routeOptions: EngineRouteInfo): void;
    resolveRouteMap(name: string): InternalFactory<any, any>;
  }
  export default class DSLImpl implements DSL {
    parent: string | null;
    matches: Array<Object | undefined>;
    enableLoadingSubstates: boolean;
    explicitIndex: boolean;
    options: DSLImplOptions;
    constructor(name: string | null | undefined, options: DSLImplOptions);
    route(name: string): void;
    route(name: string, callback: DSLCallback): void;
    route(name: string, options: RouteOptions): void;
    route(name: string, options: RouteOptions, callback: DSLCallback): void;
    push(
      url: string,
      name: string,
      callback?: MatchCallback,
      serialize?: (
        model: {},
        params: string[]
      ) => {
        [key: string]: unknown | undefined;
      }
    ): void;
    generate(): MatchCallback;
    mount(_name: string, options?: MountOptions): void;
  }
}
