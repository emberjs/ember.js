import {
  CompileTimeResolverDelegate,
  ComponentCapabilities,
  Option,
  TemplateMeta,
  CompileTimeComponent,
  CompilableProgram,
  Template,
} from '@glimmer/interfaces';
import { preprocess } from '../compilable-template';
import { templateMeta } from '@glimmer/util';

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
  wrapped: false,
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
  wrapped: false,
};

export interface ResolverDelegate {
  lookupHelper?(name: string, referrer: TemplateMeta): Option<number> | void;
  lookupModifier?(name: string, referrer: TemplateMeta): Option<number> | void;
  lookupComponent?(
    name: string,
    referrer: Option<TemplateMeta>
  ): Option<CompileTimeComponent> | void;
  lookupPartial?(name: string, referrer: TemplateMeta): Option<number> | void;

  compile?(source: string, name: string, wrapped: boolean): CompilableProgram;

  // For debugging
  resolve?(handle: number): TemplateMeta;
}

export class DefaultCompileTimeResolverDelegate implements CompileTimeResolverDelegate {
  constructor(private inner: ResolverDelegate) {}

  lookupHelper(name: string, referrer: TemplateMeta): Option<number> {
    if (this.inner.lookupHelper) {
      let helper = this.inner.lookupHelper(name, referrer);

      if (helper === undefined) {
        throw new Error(
          `Unexpected helper (${name} from ${JSON.stringify(
            referrer
          )}) (lookupHelper returned undefined)`
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
          `Unexpected modifier (${name} from ${JSON.stringify(
            referrer
          )}) (lookupModifier returned undefined)`
        );
      }

      return modifier;
    } else {
      throw new Error(
        `Can't compile global modifier invocations without an implementation of lookupModifier`
      );
    }
  }

  lookupComponent(name: string, referrer: Option<TemplateMeta>): Option<CompileTimeComponent> {
    if (this.inner.lookupComponent) {
      let component = this.inner.lookupComponent(name, referrer);

      if (component === undefined) {
        throw new Error(
          `Unexpected component (${name} from ${JSON.stringify(
            referrer
          )}) (lookupComponent returned undefined)`
        );
      }

      return component;
    } else {
      throw new Error(
        `Can't compile global component invocations without an implementation of lookupComponent`
      );
    }
  }

  lookupPartial(name: string, referrer: TemplateMeta): Option<number> {
    if (this.inner.lookupPartial) {
      let partial = this.inner.lookupPartial(name, referrer);

      if (partial === undefined) {
        throw new Error(
          `Unexpected partial (${name} from ${JSON.stringify(
            referrer
          )}) (lookupPartial returned undefined)`
        );
      }

      return partial;
    } else {
      throw new Error(
        `Can't compile global partial invocations without an implementation of lookupPartial`
      );
    }
  }

  compile(source: string): Template {
    return preprocess(source, templateMeta({}));
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
