import { Environment } from './environment';
// eslint-disable-next-line node/no-extraneous-import
import { Reference } from '@glimmer/reference';
import { Destroyable } from '../core';
import { DynamicScope } from './scope';
import { Owner } from './owner';
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
