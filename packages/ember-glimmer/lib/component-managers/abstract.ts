import { DEBUG } from 'ember-env-flags';

// implements the ComponentManager interface as defined in glimmer:
// https://github.com/glimmerjs/glimmer-vm/blob/v0.24.0-beta.4/packages/%40glimmer/runtime/lib/component/interfaces.ts#L21

export default class AbstractManager {
  public debugStack: any;
  public _pushToDebugStack: (name: string, environment: any) => void;
  public _pushEngineToDebugStack: (name: string, environment: any) => void;

  constructor() {
    this.debugStack = undefined;
  }

  prepareArgs(definition, args): any | null {
    return null;
  }

  // must be implemented by inheritors, inheritors should also
  // call `this._pushToDebugStack` to ensure the rerendering
  // assertion messages are properly maintained
  create(env, definition, args, dynamicScope, caller, hasBlock) {
    if (DEBUG) {
      throw new Error('AbstractManager#create must be implemented.');
    }
  }

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
  update(bucket, dynamicScope?) { }

  // inheritors should also call `this.debugStack.pop()` to
  // ensure the rerendering assertion messages are properly
  // maintained
  didUpdateLayout(bucket, bounds) { }

  didUpdate(bucket) { }

  getDestructor(bucket) { }
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
