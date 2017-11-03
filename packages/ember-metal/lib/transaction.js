import { meta as metaFor } from './meta';
import WeakMap from './weak_map';
import { HAS_NATIVE_WEAKMAP } from 'ember-utils';
import { assert, deprecate } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import {
  EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER,
  EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER
} from 'ember/features';

let runInTransaction, didRender, assertNotRendered;

// detect-backtracking-rerender by default is debug build only
// detect-glimmer-allow-backtracking-rerender can be enabled in custom builds
if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER || EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {

  // there are 4 states

  // NATIVE WEAKMAP AND DEBUG
  // tracks lastRef and lastRenderedIn per rendered object and key during a transaction
  // release everything via normal weakmap semantics by just derefencing the weakmap

  // NATIVE WEAKMAP AND RELEASE
  // tracks transactionId per rendered object and key during a transaction
  // release everything via normal weakmap semantics by just derefencing the weakmap

  // WEAKMAP POLYFILL AND DEBUG
  // tracks lastRef and lastRenderedIn per rendered object and key during a transaction
  // since lastRef retains a lot of app state (will have a ref to the Container)
  // if the object rendered is retained (like a immutable POJO in module state)
  // during acceptance tests this adds up and obfuscates finding other leaks.

  // WEAKMAP POLYFILL AND RELEASE
  // tracks transactionId per rendered object and key during a transaction
  // leaks it because small and likely not worth tracking it since it will only
  // be leaked if the object is retained

  class TransactionRunner {
    constructor() {
      this.transactionId = 0;
      this.inTransaction = false;
      this.shouldReflush = false;
      this.weakMap = new WeakMap();
      if (DEBUG) {
        // track templates
        this.debugStack = undefined;

        if (!HAS_NATIVE_WEAKMAP) {
          // DEBUG AND POLYFILL
          // needs obj tracking
          this.objs = [];
        }
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

          let message = `You modified "${label}" twice on ${object} in a single render. It was rendered in ${lastRenderedIn} and modified in ${currentlyIn}. This was unreliable and slow in Ember 1.x and`;

          if (EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {
            deprecate(`${message} will be removed in Ember 3.0.`, false, { id: 'ember-views.render-double-modify', until: '3.0.0' });
          } else {
            assert(`${message} is no longer supported. See https://github.com/emberjs/ember.js/issues/13948 for more details.`, false);
          }
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
      if (DEBUG && !HAS_NATIVE_WEAKMAP) {
        // POLYFILL AND DEBUG
        // requires tracking objects
        this.objs.push(object);
      }
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
      if (HAS_NATIVE_WEAKMAP) {
        // NATIVE AND (DEBUG OR RELEASE)
        // if we have a real native weakmap
        // releasing the ref will allow the values to be GCed
        this.weakMap = new WeakMap();
      } else if (DEBUG) {
        // POLYFILL AND DEBUG
        // with a polyfill the weakmap keys must be cleared since
        // they have the last reference, acceptance tests will leak
        // the container if you render a immutable object retained
        // in module scope.
        let { objs, weakMap } = this;
        this.objs = [];
        for (let i = 0; i < objs.length; i++) {
          weakMap.delete(objs[i]);
        }
      }
      // POLYFILL AND RELEASE
      // we leak the key map if the object is retained but this is
      // a POJO of keys to transaction ids
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
