import TestJitRuntimeResolver from './resolver';
import { TestJitRegistry } from './registry';
import {
  SyntaxCompilationContext,
  WholeProgramCompilationContext,
  JitRuntimeContext,
  Environment,
} from '@glimmer/interfaces';
import { SimpleDocument, SimpleElement } from '@simple-dom/interface';
import { RuntimeEnvironmentDelegate, JitRuntime } from '@glimmer/runtime';
import { registerHelper } from './register';
import { TestJitCompilationContext } from './compilation-context';
import { TestMacros } from '../../compile/macros';

export interface TestContext {
  resolver: TestJitRuntimeResolver;
  registry: TestJitRegistry;
  syntax: SyntaxCompilationContext;
  program: WholeProgramCompilationContext;
  doc: SimpleDocument;
  root: SimpleElement;
  runtime: JitRuntimeContext;
  env: Environment;
}

export function JitTestContext(delegate: RuntimeEnvironmentDelegate = {}): TestContext {
  let resolver = new TestJitRuntimeResolver();
  let registry = resolver.registry;
  registerHelper(registry, 'hash', (_positional, named) => named);

  let context = new TestJitCompilationContext(resolver, registry);
  let syntax: SyntaxCompilationContext = { program: context, macros: new TestMacros() };
  let doc = document as SimpleDocument;

  let runtime = JitRuntime(document as SimpleDocument, context.program(), resolver, {
    toBool: emberToBool,
    ...delegate,
  });

  let root = document.getElementById('qunit-fixture')! as SimpleElement;

  return { resolver, registry, program: context, syntax, doc, root, runtime, env: runtime.env };
}

export function emberToBool(value: any): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  } else {
    return !!value;
  }
}
