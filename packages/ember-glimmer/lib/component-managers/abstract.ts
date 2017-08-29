import { DEBUG } from 'ember-env-flags';
import { ComponentManager, Arguments, PreparedArguments } from '@glimmer/runtime';
import { Maybe, Opaque, Option } from '@glimmer/interfaces';
import { ComponentCapabilities } from '@glimmer/opcode-compiler';
import { VersionedPathReference } from '@glimmer/reference';
import Environment from '../environment';
import { DynamicScope } from '../renderer';

// implements the ComponentManager interface as defined in glimmer:
// https://github.com/glimmerjs/glimmer-vm/blob/v0.24.0-beta.4/packages/%40glimmer/runtime/lib/component/interfaces.ts#L21

export default abstract class AbstractManager<Component, Definition> implements ComponentManager<Component, Definition> {
  protected debugStack: Maybe<Opaque[]> = undefined;

  abstract getCapabilities(definition: Definition): ComponentCapabilities;

  prepareArgs(_definition: Definition, _args: Arguments): Option<PreparedArguments> {
    return null;
  }

  abstract create(env: Environment, definition: Definition, args: Option<IArguments>, dynamicScope: DynamicScope, caller: VersionedPathReference<Opaque>, hasDefaultBlock: boolean): Component;

  layoutFor(definition, bucket, env) {
    if (DEBUG) {
      throw new Error('AbstractManager#create must be implemented.');
    }
  }

  getSelf(bucket) { return bucket; }

  didCreateElement(bucket, element, operations) { }

  // inheritors should also call `this.debugStack.pop()` to
  // ensure the rerendering assertion messages are properly
  // maintained
  didRenderLayout(bucket, bounds) { }

  didCreate(bucket) { }

  getTag(bucket) { return null; }

  // inheritors should also call `this._pushToDebugStack`
  // to ensure the rerendering assertion messages are
  // properly maintained
  update(bucket, dynamicScope) { }

  // inheritors should also call `this.debugStack.pop()` to
  // ensure the rerendering assertion messages are properly
  // maintained
  didUpdateLayout(bucket, bounds) { }

  didUpdate(bucket) { }

  getDestructor(bucket) { }
}

if (DEBUG) {
  AbstractManager.prototype['_pushToDebugStack'] = function(name, environment) {
    this.debugStack = environment.debugStack;
    this.debugStack.push(name);
  };

  AbstractManager.prototype['_pushEngineToDebugStack'] = function(name, environment) {
    this.debugStack = environment.debugStack;
    this.debugStack.pushEngine(name);
  };
}
