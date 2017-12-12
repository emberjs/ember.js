import { meta as metaFor } from './meta';
import { assert, deprecate } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import {
  EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER,
} from 'ember/features';

let runInTransaction, didRender, assertNotRendered;

// detect-backtracking-rerender by default is debug build only
if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER) {

  // there are 2 states

  // DEBUG
  // tracks lastRef and lastRenderedIn per rendered object and key during a transaction
  // release everything via normal weakmap semantics by just derefencing the weakmap

  // RELEASE
  // tracks transactionId per rendered object and key during a transaction
  // release everything via normal weakmap semantics by just derefencing the weakmap

  class TransactionRunner {
    constructor() {
      this.transactionId = 0;
      this.inTransaction = false;
      this.shouldReflush = false;
      this.weakMap = new WeakMap();
      if (DEBUG) {
        // track templates
        this.debugStack = undefined;
      }
    }

    runInTransaction(context, methodName) {
      this.before(context);
      try {
        context[methodName]();
      } finally {
        this.after();
      }
      return this.shouldReflush;
    }

    didRender(object, key, reference) {
      if (!this.inTransaction) { return; }
      if (DEBUG) {
        this.setKey(object, key, {
          lastRef: reference,
          lastRenderedIn: this.debugStack.peek(),
        });
      } else {
        this.setKey(object, key, this.transactionId);
      }
    }

    assertNotRendered(object, key) {
      if (!this.inTransaction) { return; }
      if (this.hasRendered(object, key)) {
        if (DEBUG) {
          let { lastRef, lastRenderedIn } = this.getKey(object, key);
          let currentlyIn = this.debugStack.peek();

          let parts = [];
          let label;

          if (lastRef !== undefined) {
            while (lastRef && lastRef._propertyKey) {
              parts.unshift(lastRef._propertyKey);
              lastRef = lastRef._parentReference;
            }

            label = parts.join('.');
          } else {
            label = 'the same value';
          }

          assert(`You modified "${label}" twice on ${object} in a single render. It was rendered in ${lastRenderedIn} and modified in ${currentlyIn}. This was unreliable and slow in Ember 1.x and is no longer supported. See https://github.com/emberjs/ember.js/issues/13948 for more details.`, false);
        }

        this.shouldReflush = true;
      }
    }

    hasRendered(object, key) {
      if (!this.inTransaction) { return false; }
      if (DEBUG) {
        return this.getKey(object, key) !== undefined;
      }
      return this.getKey(object, key) === this.transactionId;
    }

    before(context) {
      this.inTransaction = true;
      this.shouldReflush = false;
      if (DEBUG) {
        this.debugStack = context.env.debugStack;
      }
    }

    after() {
      this.transactionId++;
      this.inTransaction = false;
      if (DEBUG) {
        this.debugStack = undefined;
      }
      this.clearObjectMap();
    }

    createMap(object) {
      let map = Object.create(null);
      this.weakMap.set(object, map);
      return map;
    }

    getOrCreateMap(object) {
      let map = this.weakMap.get(object);
      if (map === undefined) {
        map = this.createMap(object);
      }
      return map;
    }

    setKey(object, key, value) {
      let map = this.getOrCreateMap(object);
      map[key] = value;
    }

    getKey(object, key) {
      let map = this.weakMap.get(object);
      if (map !== undefined) {
        return map[key];
      }
    }

    clearObjectMap() {
      this.weakMap = new WeakMap();
    }
  }

  let runner = new TransactionRunner();

  runInTransaction   = runner.runInTransaction.bind(runner);
  didRender          = runner.didRender.bind(runner);
  assertNotRendered  = runner.assertNotRendered.bind(runner);
} else {
  // in production do nothing to detect reflushes
  runInTransaction = (context, methodName) => {
    context[methodName]();
    return false;
  };
}

export { runInTransaction as default, didRender, assertNotRendered };
