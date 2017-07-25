import { IArguments } from '../vm/arguments';
import { DOMChanges } from '../dom/helper';
import { DynamicScope } from '../environment';
import { Destroyable } from '@glimmer/util';
import { Option, Unique } from "@glimmer/interfaces";
import { Tag } from '@glimmer/reference';

export type Modifier = Unique<"ModifierStateBucker">;

export interface ModifierManager<T = Modifier> {
  // Create is meant to only produce the state bucket
  create(element: Element, args: IArguments, dynamicScope: DynamicScope, dom: DOMChanges): T;

  // Convert the opaque modifier into a `RevisionTag` that determins when
  // the modifier's update hooks need to be called (if at all).
  getTag(component: T): Tag;

  // At initial render, the modifier gets a chance to install itself on the
  // element it is managing. It can also return a bucket of state that
  // it could use at update time. From the perspective of Glimmer, this
  // is an opaque token.
  install(modifier: T): void;

  // When the modifier's tag has invalidated, the manager's `update` hook is
  // called.
  update(modifier: T): void;

  // Convert the opaque token into an object that implements Destroyable.
  // If it returns null, the modifier will not be destroyed.
  getDestructor(modifier: T): Option<Destroyable>;
}
