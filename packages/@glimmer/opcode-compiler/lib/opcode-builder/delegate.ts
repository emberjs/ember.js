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

export class DefaultCompileTimeResolverDelegate implements CompileTimeResolverDelegate {
  constructor(private inner: Partial<CompileTimeResolverDelegate>) {}

  getCapabilities(handle: number): ComponentCapabilities {
    if (this.inner.getCapabilities) {
      return this.inner.getCapabilities(handle);
    } else {
      return DEFAULT_CAPABILITIES;
    }
  }

  getLayout(handle: number): Option<CompilableProgram> {
    if (this.inner.getLayout) {
      return this.inner.getLayout(handle);
    } else {
      throw new Error(
        `Can't compile global component invocations without an implementation of getLayout`
      );
    }
  }

  lookupHelper(name: string, referrer: TemplateMeta): Option<number> {
    if (this.inner.lookupHelper) {
      return this.inner.lookupHelper(name, referrer);
    } else {
      throw new Error(
        `Can't compile global helper invocations without an implementation of lookupHelper`
      );
    }
  }

  lookupModifier(name: string, referrer: TemplateMeta): Option<number> {
    if (this.inner.lookupModifier) {
      return this.inner.lookupModifier(name, referrer);
    } else {
      throw new Error(
        `Can't compile global modifier invocations without an implementation of lookupModifier`
      );
    }
  }

  lookupComponentDefinition(name: string, referrer: Option<TemplateMeta>): Option<number> {
    if (this.inner.lookupComponentDefinition) {
      return this.inner.lookupComponentDefinition(name, referrer);
    } else {
      throw new Error(
        `Can't compile global component invocations without an implementation of lookupComponentDefinition`
      );
    }
  }

  lookupPartial(name: string, referrer: TemplateMeta): Option<number> {
    if (this.inner.lookupPartial) {
      return this.inner.lookupPartial(name, referrer);
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
