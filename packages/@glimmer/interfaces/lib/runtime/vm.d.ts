import { Environment, DynamicScope } from './environment';
import { PathReference } from '@glimmer/reference';
import { SymbolDestroyable, Destroyable } from '../core';
import { VMArguments } from './arguments';

/**
 * This is used in the Glimmer Embedding API. In particular, embeddings
 * provide helpers through the `CompileTimeLookup` interface, and the
 * helpers they provide implement the `Helper` interface, which is a
 * function that takes a `VM` as a parameter.
 */
export interface VM {
  env: Environment;
  dynamicScope(): DynamicScope;
  getSelf(): PathReference;
  associateDestroyable(child: SymbolDestroyable | Destroyable): void;
}

export interface Helper {
  (args: VMArguments, vm: VM): PathReference;
}
