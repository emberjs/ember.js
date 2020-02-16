import TestJitRuntimeResolver from './resolver';
import { TestJitRegistry } from './registry';
import {
  SyntaxCompilationContext,
  JitRuntimeContext,
  Environment,
  Dict,
} from '@glimmer/interfaces';
import { SimpleDocument, SimpleElement } from '@simple-dom/interface';
import { EnvironmentDelegate, JitRuntime } from '@glimmer/runtime';
import { registerHelper } from './register';
import JitCompileTimeLookup from './compilation-context';
import { TestMacros } from '../../compile/macros';
import { assign } from '@glimmer/util';
import { JitContext } from '@glimmer/opcode-compiler';

export interface TestContext extends Dict {
  resolver: TestJitRuntimeResolver;
  registry: TestJitRegistry;
  syntax: SyntaxCompilationContext;
  doc: SimpleDocument;
  root: SimpleElement;
  runtime: JitRuntimeContext;
  env: Environment;
}

export function JitTestContext(delegate: EnvironmentDelegate = {}): TestContext {
  let resolver = new TestJitRuntimeResolver();
  let registry = resolver.registry;
  registerHelper(registry, 'hash', (_positional, named) => named);

  let context = JitContext(new JitCompileTimeLookup(resolver, registry), new TestMacros());
  let doc = document as SimpleDocument;

  let runtime = JitRuntime(
    { document: document as SimpleDocument },
    assign({ toBool: emberToBool }, delegate),
    context,
    resolver
  );

  let root = document.getElementById('qunit-fixture')! as SimpleElement;

  return {
    resolver,
    registry,
    syntax: context,
    doc,
    root,
    runtime,
    env: runtime.env,
  };
}

export function emberToBool(value: any): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  } else {
    return !!value;
  }
}
