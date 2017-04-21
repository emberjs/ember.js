import { DEBUG } from 'ember-env-flags';

class AbstractManager {

}

if (DEBUG) {
  AbstractManager.prototype._pushToDebugStack = function(name, environment) {
    this.debugStack = environment.debugStack;
    this.debugStack.push(name);
  };

  AbstractManager.prototype._pushEngineToDebugStack = function(name, environment) {
    this.debugStack = environment.debugStack;
    this.debugStack.pushEngine(name);
  };
}

export default AbstractManager;
