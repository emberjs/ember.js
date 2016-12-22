import { EvaluatedArgs } from '../compiled/expressions/args';
import { DOMChanges } from '../dom/helper';
import { DynamicScope } from '../environment';
import { Destroyable } from 'glimmer-util';

export interface ModifierManager<T> {
  // Create is meant to only produce the state bucket
  create(element: Element, args: EvaluatedArgs, dynamicScope: DynamicScope, dom: DOMChanges): T;
  // At initial render, the modifier gets a chance to install itself on the
  // element it is managing. It can also return a bucket of state that
  // it could use at update time. From the perspective of Glimmer, this
  // is an opaque token.
  install(modifier: T): void;

  // When the args have changed, the modifier's `update` hook is called
  // with its state bucket as well as the updated args.
  update(modifier: T): void;

  // Convert the opaque token into an object that implements Destroyable.
  // If it returns null, the modifier will not be destroyed.
  getDestructor(modifier: T): Destroyable;
}
