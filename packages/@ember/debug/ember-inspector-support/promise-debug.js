import DebugPort from './debug-port';
import PromiseAssembler from '@ember/debug/ember-inspector-support/libs/promise-assembler';
import { debounce } from '@ember/debug/ember-inspector-support/utils/ember/runloop';
import RSVP from '@ember/debug/ember-inspector-support/utils/rsvp';

export default class extends DebugPort {
  get objectInspector() {
    return this.namespace?.objectInspector;
  }
  get adapter() {
    return this.namespace?.adapter;
  }
  get session() {
    return this.__session || this.namespace?.session;
  }

  set session(value) {
    this.__session = value;
  }

  constructor(data) {
    super(data);
    this.promiseAssembler = new PromiseAssembler();
    this.updatedPromises = [];
    this.releaseMethods = [];
    this.setInstrumentWithStack();
    this.sendInstrumentWithStack();
    this.promiseAssembler.start();
  }

  delay = 100;

  willDestroy() {
    this.releaseAll();
    if (this.promiseAssembler) {
      this.promiseAssembler.destroy();
    }
    this.promiseAssembler = null;
    super.willDestroy();
  }

  static {
    this.prototype.portNamespace = 'promise';
    this.prototype.messages = {
      getAndObservePromises() {
        this.getAndObservePromises();
      },

      releasePromises() {
        this.releaseAll();
      },

      sendValueToConsole(message) {
        let promiseId = message.promiseId;
        let promise = this.promiseAssembler.find(promiseId);
        let value = promise.value;
        if (value === undefined) {
          value = promise.reason;
        }
        this.objectInspector.sendValueToConsole(value);
      },

      tracePromise(message) {
        let id = message.promiseId;
        let promise = this.promiseAssembler.find(id);
        // Remove first two lines and add label
        let stack = promise.stack;
        if (stack) {
          stack = stack.split('\n');
          stack.splice(0, 2, [
            `Ember Inspector (Promise Trace): ${promise.label || ''}`,
          ]);
          this.adapter.log(stack.join('\n'));
        }
      },

      setInstrumentWithStack(message) {
        let bool = message.instrumentWithStack;
        this.instrumentWithStack = bool;
        this.setInstrumentWithStack();
      },

      getInstrumentWithStack() {
        this.sendInstrumentWithStack();
      },
    };
  }

  get instrumentWithStack() {
    return !!this.session.getItem('promise:stack');
  }

  set instrumentWithStack(value) {
    this.session.setItem('promise:stack', value);
  }

  sendInstrumentWithStack() {
    this.sendMessage('instrumentWithStack', {
      instrumentWithStack: this.instrumentWithStack,
    });
  }

  setInstrumentWithStack() {
    RSVP.configure('instrument-with-stack', this.instrumentWithStack);
    this.sendInstrumentWithStack();
  }

  releaseAll() {
    this.releaseMethods.forEach((fn) => {
      fn();
    });
    this.releaseMethods.length = 0;
  }

  getAndObservePromises() {
    this.promiseAssembler.on('created', this, this.promiseUpdated);
    this.promiseAssembler.on('fulfilled', this, this.promiseUpdated);
    this.promiseAssembler.on('rejected', this, this.promiseUpdated);
    this.promiseAssembler.on('chained', this, this.promiseChained);

    this.releaseMethods.push(() => {
      this.promiseAssembler.off('created', this, this.promiseUpdated);
      this.promiseAssembler.off('fulfilled', this, this.promiseUpdated);
      this.promiseAssembler.off('rejected', this, this.promiseUpdated);
      this.promiseAssembler.off('chained', this, this.promiseChained);
    });

    this.promisesUpdated(this.promiseAssembler.find());
  }

  promisesUpdated(uniquePromises) {
    if (!uniquePromises) {
      uniquePromises = [...new Set(this.updatedPromises)];
    }
    // Remove inspector-created promises
    uniquePromises = uniquePromises.filter(
      (promise) => promise.label !== 'ember-inspector'
    );
    const serialized = this.serializeArray(uniquePromises);
    this.sendMessage('promisesUpdated', {
      promises: serialized,
    });
    this.updatedPromises.length = 0;
  }

  promiseUpdated(event) {
    this.updatedPromises.push(event.promise);
    debounce(this, 'promisesUpdated', this.delay);
  }

  promiseChained(event) {
    this.updatedPromises.push(event.promise);
    this.updatedPromises.push(event.child);
    debounce(this, 'promisesUpdated', this.delay);
  }

  serializeArray(promises) {
    return promises.map((item) => this.serialize(item));
  }

  serialize(promise) {
    let serialized = {};
    serialized.guid = promise.guid;
    serialized.state = promise.state;
    serialized.label = promise.label;
    if (promise.children) {
      serialized.children = this.promiseIds(promise.children);
    }
    serialized.parent = promise.parent?.guid;
    serialized.value = this.inspectValue(promise, 'value');
    serialized.reason = this.inspectValue(promise, 'reason');
    if (promise.createdAt) {
      serialized.createdAt = promise.createdAt?.getTime();
    }
    if (promise.settledAt) {
      serialized.settledAt = promise.settledAt?.getTime();
    }
    serialized.hasStack = !!promise.stack;
    return serialized;
  }

  promiseIds(promises) {
    return promises.map((promise) => promise.guid);
  }

  /**
   * Inspect the promise and pass to object inspector
   * @param {Promise} promise The promise object
   * @param {string} key The key for the property on the promise
   * @return {*|{inspect: (string|*), type: string}|{computed: boolean, inspect: string, type: string}|{inspect: string, type: string}}
   */
  inspectValue(promise, key) {
    let objectInspector = this.objectInspector;
    let inspected = objectInspector.inspectValue(promise, key);

    if (
      inspected.type === 'type-ember-object' ||
      inspected.type === 'type-array'
    ) {
      console.count('inspectValue');

      inspected.objectId = objectInspector.retainObject(promise[key]);
      this.releaseMethods.push(function () {
        objectInspector.releaseObject(inspected.objectId);
      });
    }
    return inspected;
  }
}
