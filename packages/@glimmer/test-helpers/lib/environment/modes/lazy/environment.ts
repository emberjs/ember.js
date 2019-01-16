import {
  CompilableProgram,
  ComponentDefinition,
  GlimmerTreeChanges,
  GlimmerTreeConstruction,
  Option,
} from '@glimmer/interfaces';
import { CurriedComponentDefinition, curry } from '@glimmer/runtime';
import { SimpleDocument } from '@simple-dom/interface';
import LazyRuntimeResolver from './runtime-resolver';

export interface TestEnvironmentOptions {
  document?: SimpleDocument;
  appendOperations?: GlimmerTreeConstruction;
  updateOperations?: GlimmerTreeChanges;
  program?: CompilableProgram;
}

export function componentHelper(
  resolver: LazyRuntimeResolver,
  name: string
): Option<CurriedComponentDefinition> {
  let handle = resolver.lookupComponentHandle(name);

  if (handle === null) return null;

  let spec = resolver.resolve<ComponentDefinition>(handle);
  return curry(spec);
}
