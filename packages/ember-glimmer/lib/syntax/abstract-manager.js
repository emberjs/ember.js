import { runInDebug } from 'ember-debug';

class AbstractManager {

}

runInDebug(() => {
  AbstractManager.prototype._pushToDebugStack = function(name, environment) {
    this.debugStack = environment.debugStack;
    this.debugStack.push(name);
  };

  AbstractManager.prototype._pushEngineToDebugStack = function(name, environment) {
    this.debugStack = environment.debugStack;
    this.debugStack.pushEngine(name);
  };
});

export default AbstractManager;
