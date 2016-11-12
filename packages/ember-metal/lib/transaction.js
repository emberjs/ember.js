import { meta as metaFor } from './meta';
import { assert, runInDebug, deprecate } from './debug';
import isEnabled from './features';

let runInTransaction, didRender, assertNotRendered;

let raise = assert;
if (isEnabled('ember-glimmer-allow-backtracking-rerender')) {
  raise = (message, test) => {
    deprecate(message, test, { id: 'ember-views.render-double-modify', until: '3.0.0' });
  };
}

let implication;
if (isEnabled('ember-glimmer-allow-backtracking-rerender')) {
  implication = 'will be removed in Ember 3.0.';
} else if (isEnabled('ember-glimmer-detect-backtracking-rerender')) {
  implication = 'is no longer supported. See https://github.com/emberjs/ember.js/issues/13948 for more details.';
}

if (isEnabled('ember-glimmer-detect-backtracking-rerender') ||
    isEnabled('ember-glimmer-allow-backtracking-rerender')) {
  let counter = 0;
  let inTransaction = false;
  let shouldReflush;

  runInTransaction = function(context, methodName) {
    shouldReflush = false;
    inTransaction = true;
    context[methodName]();
    inTransaction = false;
    counter++;
    return shouldReflush;
  };

  didRender = function(object, key, reference) {
    if (!inTransaction) { return; }
    let meta = metaFor(object);
    let lastRendered = meta.writableLastRendered();
    lastRendered[key] = counter;

    runInDebug(() => {
      let lastRenderedFrom = meta.writableLastRenderedFrom();
      lastRenderedFrom[key] = reference;
    });
  };

  assertNotRendered = function(object, key, _meta) {
    let meta = _meta || metaFor(object);
    let lastRendered = meta.readableLastRendered();

    if (lastRendered && lastRendered[key] === counter) {
      raise(
        (function() {
          let ref = meta.readableLastRenderedFrom();
          let parts = [];
          let lastRef = ref[key];

          let label;

          if (lastRef) {
            while (lastRef && lastRef._propertyKey) {
              parts.unshift(lastRef._propertyKey);
              lastRef = lastRef._parentReference;
            }

            label = parts.join();
          } else {
            label = 'the same value';
          }

          return `You modified ${label} twice on ${object} in a single render. This was unreliable and slow in Ember 1.x and ${implication}`;
        }()),
        false);

      shouldReflush = true;
    }
  };
} else {
  runInTransaction = function() {
    throw new Error('Cannot call runInTransaction without Glimmer');
  };

  didRender = function() {
    throw new Error('Cannot call didRender without Glimmer');
  };

  assertNotRendered = function() {
    throw new Error('Cannot call assertNotRendered without Glimmer');
  };
}

export { runInTransaction as default, didRender, assertNotRendered };
