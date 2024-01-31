import type { Destroyable } from '../core.js';
import type { GlimmerTreeChanges } from '../dom/changes.js';
import type { Reference } from '../references.js';
import type { Environment } from './environment.js';
import type { Owner } from './owner.js';
import type { ExceptionHandler } from './render.js';
import type { DynamicScope } from './scope.js';
/**
 * This is used in the Glimmer Embedding API. In particular, embeddings
 * provide helpers through the `CompileTimeLookup` interface, and the
 * helpers they provide implement the `Helper` interface, which is a
 * function that takes a `VM` as a parameter.
 */
export interface VM<O extends Owner = Owner> {
  env: Environment;
  dynamicScope(): DynamicScope;
  getOwner(): O;
  getSelf(): Reference;
  associateDestroyable(child: Destroyable): void;
}

export interface UpdatingVM {
  env: Environment;
  dom: GlimmerTreeChanges;
  alwaysRevalidate: boolean;

  execute(opcodes: UpdatingOpcode[], handler: ExceptionHandler): void;
  goto(index: number): void;
  try(ops: UpdatingOpcode[], handler: ExceptionHandler | null): void;
  throw(): void;
}

export interface UpdatingOpcode {
  evaluate(vm: UpdatingVM): void;
}
