import { EvaluatedArgs } from '../compiled/expressions/args';
import { FunctionExpression } from '../compiled/expressions/function';
import { CompiledProgram } from '../compiled/blocks';
import { Layout } from '../scanner';

import Environment, { DynamicScope } from '../environment';
import { ElementOperations } from '../builder';
import Bounds from '../bounds';
import * as Simple from '../dom/interfaces';

import { Destroyable, Opaque } from '@glimmer/util';
import { PathReference, RevisionTag } from '@glimmer/reference';

export type Component = Opaque;
export type ComponentClass = any;

export interface ComponentManager<T extends Component> {
  // First, the component manager is asked to prepare the arguments needed
  // for `create`. This allows for things like closure components where the
  // args need to be curried before constructing the instance of the state
  // bucket.
  prepareArgs(definition: ComponentDefinition<T>, args: EvaluatedArgs, dynamicScope: DynamicScope): EvaluatedArgs;

  // Then, the component manager is asked to create a bucket of state for
  // the supplied arguments. From the perspective of Glimmer, this is
  // an opaque token, but in practice it is probably a component object.
  create(env: Environment, definition: ComponentDefinition<T>, args: EvaluatedArgs, dynamicScope: DynamicScope, caller: PathReference<Opaque>, hasDefaultBlock: boolean): T;

  // Return the compiled layout to use for this component. This is called
  // *after* the component instance has been created, because you might
  // want to return a different layout per-instance for optimization reasons
  // or to implement features like Ember's "late-bound" layouts.
  layoutFor(definition: ComponentDefinition<T>, component: T, env: Environment): CompiledProgram;

  // Next, Glimmer asks the manager to create a reference for the `self`
  // it should use in the layout.
  getSelf(component: T): PathReference<Opaque>;

  // The `didCreateElement` hook is run for non-tagless components after the
  // element as been created, but before it has been appended ("flushed") to
  // the DOM. This hook allows the manager to save off the element, as well as
  // install other dynamic attributes via the ElementOperations object.
  //
  // Hosts should use `didCreate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didCreateElement(component: T, element: Simple.Element, operations: ElementOperations): void;

  // This hook is run after the entire layout has been rendered.
  //
  // Hosts should use `didCreate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didRenderLayout(component: T, bounds: Bounds): void;

  // Once the whole top-down rendering process is complete, Glimmer invokes
  // the `didCreate` callbacks.
  didCreate(component: T): void;

  // Convert the opaque component into a `RevisionTag` that determins when
  // the component's update hooks need to be called, in addition to any
  // outside changes captured in the input arguments. If it returns null,
  // the update hooks will only be called when one or more of the input
  // arguments has changed.
  getTag(component: T): RevisionTag;

  // When the input arguments have changed, and top-down revalidation has
  // begun, the manager's `update` hook is called.
  update(component: T, args: EvaluatedArgs, dynamicScope: DynamicScope): void;

  // This hook is run after the entire layout has been updated.
  //
  // Hosts should use `didUpdate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didUpdateLayout(component: T, bounds: Bounds): void;

  // Finally, once top-down revalidation has completed, Glimmer invokes
  // the `didUpdate` callbacks on components that changed.
  didUpdate(component: T): void;

  // Convert the opaque component into an object that implements Destroyable.
  // If it returns null, the component will not be destroyed.
  getDestructor(component: T): Destroyable;
}

export interface ComponentLayoutBuilder {
  env: Environment;
  tag: ComponentTagBuilder;
  attrs: ComponentAttrsBuilder;

  wrapLayout(layout: Layout): void;
  fromLayout(layout: Layout): void;
}

export interface ComponentTagBuilder {
  static(tagName: string): void;
  dynamic(tagName: FunctionExpression<string>): void;
}

export interface ComponentAttrsBuilder {
  static(name: string, value: string): void;
  dynamic(name: string, value: FunctionExpression<string>): void;
}

const COMPONENT_DEFINITION_BRAND = 'COMPONENT DEFINITION [id=e59c754e-61eb-4392-8c4a-2c0ac72bfcd4]';

export function isComponentDefinition(obj: any): obj is ComponentDefinition<Opaque> {
  return typeof obj === 'object' && obj && obj[COMPONENT_DEFINITION_BRAND];
}

export abstract class ComponentDefinition<T> {
  public name: string; // for debugging
  public manager: ComponentManager<T>;
  public ComponentClass: ComponentClass;

  constructor(name: string, manager: ComponentManager<T>, ComponentClass: ComponentClass) {
    this[COMPONENT_DEFINITION_BRAND] = true;
    this.name = name;
    this.manager = manager;
    this.ComponentClass = ComponentClass;
  }
}
