import {
  WholeProgramCompilationContext,
  CompileTimeResolverDelegate,
  CompileMode,
  STDLib,
  RuntimeProgram,
  Option,
  TemplateMeta,
  AnnotatedModuleLocator,
  Template,
  CompileTimeComponent,
} from '@glimmer/interfaces';
import { Constants, HeapImpl } from '@glimmer/program';
import { TestJitRegistry } from './registry';
import TestJitRuntimeResolver from './resolver';
export declare class TestJitCompilationContext implements WholeProgramCompilationContext {
  private runtimeResolver;
  readonly constants: Constants;
  readonly resolverDelegate: JitCompileTimeLookup;
  readonly heap: HeapImpl;
  readonly mode = CompileMode.jit;
  readonly stdlib: STDLib;
  constructor(runtimeResolver: TestJitRuntimeResolver, registry: TestJitRegistry);
  program(): RuntimeProgram;
}
export default class JitCompileTimeLookup implements CompileTimeResolverDelegate {
  private resolver;
  private registry;
  constructor(resolver: TestJitRuntimeResolver, registry: TestJitRegistry);
  resolve<T>(handle: number): T;
  private getCapabilities;
  lookupHelper(name: string, referrer: TemplateMeta<AnnotatedModuleLocator>): Option<number>;
  lookupModifier(name: string, referrer: TemplateMeta<AnnotatedModuleLocator>): Option<number>;
  compile(source: string, name: string): Template;
  lookupComponent(
    name: string,
    referrer: TemplateMeta<AnnotatedModuleLocator>
  ): Option<CompileTimeComponent>;
  lookupPartial(name: string, referrer: TemplateMeta<AnnotatedModuleLocator>): Option<number>;
}
//# sourceMappingURL=compilation-context.d.ts.map
