import {
  CompileTimeResolverDelegate,
  ComponentCapabilities,
  CompilableProgram,
  Option,
  TemplateMeta,
} from '@glimmer/interfaces';

export const DEFAULT_CAPABILITIES: ComponentCapabilities = {
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
};

export const MINIMAL_CAPABILITIES: ComponentCapabilities = {
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
};

export interface ResolverDelegate {
  getCapabilities?(handle: number): ComponentCapabilities | void;
  getLayout?(handle: number): Option<CompilableProgram> | void;

  lookupHelper?(name: string, referrer: TemplateMeta): Option<number> | void;
  lookupModifier?(name: string, referrer: TemplateMeta): Option<number> | void;
  lookupComponentDefinition?(name: string, referrer: Option<TemplateMeta>): Option<number> | void;
  lookupPartial?(name: string, referrer: TemplateMeta): Option<number> | void;

  // For debugging
  resolve?(handle: number): TemplateMeta;
}

export class DefaultCompileTimeResolverDelegate implements CompileTimeResolverDelegate {
  constructor(private inner: ResolverDelegate) {}

  getCapabilities(handle: number): ComponentCapabilities {
    if (this.inner.getCapabilities) {
      let capabilities = this.inner.getCapabilities(handle);
      if (capabilities !== undefined) {
        return capabilities;
      }
    }

    return MINIMAL_CAPABILITIES;
  }

  getLayout(handle: number): Option<CompilableProgram> {
    if (this.inner.getLayout) {
      let compilable = this.inner.getLayout(handle);

      if (compilable === undefined) {
        throw new Error(`Unexpected layout handle ${handle} (getLayout returned undefined)`);
      }

      return compilable;
    } else {
      throw new Error(
        `Can't compile global component invocations without an implementation of getLayout`
      );
    }
  }

  lookupHelper(name: string, referrer: TemplateMeta): Option<number> {
    if (this.inner.lookupHelper) {
      let helper = this.inner.lookupHelper(name, referrer);

      if (helper === undefined) {
        throw new Error(
          `Unexpected helper (${name} from ${referrer}) (lookupHelper returned undefined)`
        );
      }

      return helper;
    } else {
      throw new Error(
        `Can't compile global helper invocations without an implementation of lookupHelper`
      );
    }
  }

  lookupModifier(name: string, referrer: TemplateMeta): Option<number> {
    if (this.inner.lookupModifier) {
      let modifier = this.inner.lookupModifier(name, referrer);

      if (modifier === undefined) {
        throw new Error(
          `Unexpected modifier (${name} from ${referrer}) (lookupModifier returned undefined)`
        );
      }

      return modifier;
    } else {
      throw new Error(
        `Can't compile global modifier invocations without an implementation of lookupModifier`
      );
    }
  }

  lookupComponentDefinition(name: string, referrer: Option<TemplateMeta>): Option<number> {
    if (this.inner.lookupComponentDefinition) {
      let component = this.inner.lookupComponentDefinition(name, referrer);

      if (component === undefined) {
        throw new Error(
          `Unexpected component (${name} from ${referrer}) (lookupComponentDefinition returned undefined)`
        );
      }

      return component;
    } else {
      throw new Error(
        `Can't compile global component invocations without an implementation of lookupComponentDefinition`
      );
    }
  }

  lookupPartial(name: string, referrer: TemplateMeta): Option<number> {
    if (this.inner.lookupPartial) {
      let partial = this.inner.lookupPartial(name, referrer);

      if (partial === undefined) {
        throw new Error(
          `Unexpected partial (${name} from ${referrer}) (lookupPartial returned undefined)`
        );
      }

      return partial;
    } else {
      throw new Error(
        `Can't compile global partial invocations without an implementation of lookupPartial`
      );
    }
  }

  // For debugging
  resolve(handle: number): TemplateMeta {
    if (this.inner.resolve) {
      return this.inner.resolve(handle);
    } else {
      throw new Error(`Compile-time debugging requires an implementation of resolve`);
    }
  }
}
