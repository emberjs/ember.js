import { ProgramSymbolTable } from '@glimmer/interfaces';
import { Tag, VersionedPathReference } from '@glimmer/reference';
import {
  Bounds,
  CompiledDynamicTemplate,
  ComponentDefinition,
  ComponentManager,
  DynamicScope,
  ElementOperations,
  Environment,
  PreparedArguments,
} from '@glimmer/runtime';
import { IArguments } from '@glimmer/runtime/dist/types/lib/vm/arguments';
import {
  Destroyable,
  Opaque,
  Option 
} from '@glimmer/util';
import { DEBUG } from 'ember-env-flags';
import DebugStack from '../utils/debug-stack';

// implements the ComponentManager interface as defined in glimmer:
// tslint:disable-next-line:max-line-length
// https://github.com/glimmerjs/glimmer-vm/blob/v0.24.0-beta.4/packages/%40glimmer/runtime/lib/component/interfaces.ts#L21

export default abstract class AbstractManager<T> implements ComponentManager<T> {
  public debugStack: typeof DebugStack;
  public _pushToDebugStack: (name: string, environment: any) => void;
  public _pushEngineToDebugStack: (name: string, environment: any) => void;

  constructor() {
    this.debugStack = undefined;
  }

  prepareArgs(_definition: ComponentDefinition<T>, _args: IArguments): Option<PreparedArguments> {
    return null;
  }

  // must be implemented by inheritors, inheritors should also
  // call `this._pushToDebugStack` to ensure the rerendering
  // assertion messages are properly maintained

  abstract create(
    env: Environment,
    definition: ComponentDefinition<T>,
    args: IArguments,
    dynamicScope: DynamicScope,
    caller: VersionedPathReference<void | {}>,
    hasDefaultBlock: boolean): T;
  abstract layoutFor(
    definition: ComponentDefinition<T>,
    component: T,
    env: Environment): CompiledDynamicTemplate<ProgramSymbolTable>;
  abstract getSelf(component: T): VersionedPathReference<Opaque>;

  didCreateElement(_component: T, _element: Element, _operations: ElementOperations): void {
    // noop
  }

  // inheritors should also call `this.debugStack.pop()` to
  // ensure the rerendering assertion messages are properly
  // maintained
  didRenderLayout(_component: T, _bounds: Bounds): void {
    // noop
  }

  didCreate(_bucket: T): void {
    // noop
  }

  getTag(_bucket: T): Option<Tag> { return null; }

  // inheritors should also call `this._pushToDebugStack`
  // to ensure the rerendering assertion messages are
  // properly maintained
  update(_bucket: T, _dynamicScope: DynamicScope): void {
    // noop
  }

  // inheritors should also call `this.debugStack.pop()` to
  // ensure the rerendering assertion messages are properly
  // maintained
  didUpdateLayout(_bucket: T, _bounds: Bounds): void {
    // noop
  }

  didUpdate(_bucket: T): void {
    // noop
  }

  abstract getDestructor(bucket: T): Option<Destroyable>;
}

if (DEBUG) {
  AbstractManager.prototype._pushToDebugStack = function(name: string, environment) {
    this.debugStack = environment.debugStack;
    this.debugStack.push(name);
  };

  AbstractManager.prototype._pushEngineToDebugStack = function(name: string, environment) {
    this.debugStack = environment.debugStack;
    this.debugStack.pushEngine(name);
  };
}
