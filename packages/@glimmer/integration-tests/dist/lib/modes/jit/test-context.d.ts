import TestJitRuntimeResolver from './resolver';
import { TestJitRegistry } from './registry';
import { SyntaxCompilationContext, WholeProgramCompilationContext, JitRuntimeContext, Environment, TemplateMeta } from '@glimmer/interfaces';
import { SimpleDocument, SimpleElement } from '@simple-dom/interface';
import { RuntimeEnvironmentDelegate } from '@glimmer/runtime';
export interface TestContext {
    resolver: TestJitRuntimeResolver;
    registry: TestJitRegistry;
    syntax: SyntaxCompilationContext;
    program: WholeProgramCompilationContext;
    doc: SimpleDocument;
    root: SimpleElement;
    runtime: JitRuntimeContext<TemplateMeta>;
    env: Environment;
}
export declare function JitTestContext(delegate?: RuntimeEnvironmentDelegate): TestContext;
export declare function emberToBool(value: any): boolean;
//# sourceMappingURL=test-context.d.ts.map