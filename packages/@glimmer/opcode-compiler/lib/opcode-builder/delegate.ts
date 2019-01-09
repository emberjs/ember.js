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
  getCapabilities(_handle: number): ComponentCapabilities {
    return DEFAULT_CAPABILITIES;
  }

  getLayout(_handle: number): Option<CompilableProgram> {
    throw new Error(
      `Can't compile global component invocations without an implementation of getLayout`
    );
  }

  lookupHelper(_name: string, _referrer: TemplateMeta): Option<number> {
    throw new Error(
      `Can't compile global helper invocations without an implementation of lookupHelper`
    );
  }

  lookupModifier(_name: string, _referrer: TemplateMeta): Option<number> {
    throw new Error(
      `Can't compile global modifier invocations without an implementation of lookupModifier`
    );
  }

  lookupComponentDefinition(_name: string, _referrer: Option<TemplateMeta>): Option<number> {
    throw new Error(
      `Can't compile global component invocations without an implementation of lookupComponentDefinition`
    );
  }

  lookupPartial(_name: string, _referrer: TemplateMeta): Option<number> {
    throw new Error(
      `Can't compile global partial invocations without an implementation of lookupPartial`
    );
  }

  // For debugging
  resolve(_handle: number): TemplateMeta {
    throw new Error(`Compile-time debugging requires an implementation of resolve`);
  }
}
