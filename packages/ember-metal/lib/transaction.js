import { meta as metaFor } from './meta';
import { assert, runInDebug, deprecate } from 'ember-metal/debug';
import isEnabled from 'ember-metal/features';

let runInTransaction, didRender, assertNotRendered;

if (isEnabled('ember-glimmer-detect-backtracking-rerender') ||
    isEnabled('ember-glimmer-allow-backtracking-rerender')) {
  assert('It appears you are trying to use the backtracking rerender without the "ember-glimmer" flag turned on. Please make sure that "ember-glimmer" is turned on.');
}


let raise = assert;
if (isEnabled('ember-glimmer-allow-backtracking-rerender')) {
  raise = (message, test) => {
    deprecate(message, test, { id: 'ember-views.render-double-modify', until: '3.0.0' });
  };
}

if (isEnabled('ember-glimmer-detect-backtracking-rerender') ||
    isEnabled('ember-glimmer-allow-backtracking-rerender')) {
  let counter = 0;
  let inTransaction = false;
  let shouldReflush;

  runInTransaction = function(callback) {
    shouldReflush = false;
    inTransaction = true;
    callback();
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

          while (lastRef && lastRef._propertyKey && lastRef._parentReference) {
            parts.unshift(lastRef._propertyKey);
            lastRef = lastRef._parentReference;
          }

          return `You modified ${parts.join('.')} twice in a single render. This was unreliable and slow in Ember 1.x and will be removed in Ember 3.0.`;
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
