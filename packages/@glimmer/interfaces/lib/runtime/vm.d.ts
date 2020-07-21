import { Environment } from './environment';
// eslint-disable-next-line node/no-extraneous-import
import { Reference } from '@glimmer/reference';
import { Destroyable } from '../core';
import { VMArguments } from './arguments';
import { DynamicScope } from './scope';
/**
 * This is used in the Glimmer Embedding API. In particular, embeddings
 * provide helpers through the `CompileTimeLookup` interface, and the
 * helpers they provide implement the `Helper` interface, which is a
 * function that takes a `VM` as a parameter.
 */
export interface VM {
  env: Environment;
  dynamicScope(): DynamicScope;
  getSelf(): Reference;
  associateDestroyable(child: Destroyable): void;
}

export interface Helper {
  (args: VMArguments, vm: VM): Reference;
}
