import { InternalComponentCapabilities, Option, CompileTimeComponent } from '@glimmer/interfaces';

export const DEFAULT_CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: true,
  createArgs: true,
  attributeHook: false,
  elementHook: false,
  dynamicScope: true,
  createCaller: false,
  updateHook: true,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
};

export const MINIMAL_CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  dynamicScope: false,
  createCaller: false,
  updateHook: false,
  createInstance: false,
  wrapped: false,
  willDestroy: false,
};

export interface ResolverDelegate<R = unknown> {
  lookupHelper?(name: string, referrer: R): Option<number> | void;
  lookupModifier?(name: string, referrer: R): Option<number> | void;
  lookupComponent?(name: string, referrer: R): Option<CompileTimeComponent> | void;
  lookupPartial?(name: string, referrer: R): Option<number> | void;

  // For debugging
  resolve?(handle: number): R;
}
