import { meta as metaFor } from './meta';
import { assert, runInDebug, deprecate, isFeatureEnabled } from 'ember-debug';

let runInTransaction, didRender, assertNotRendered;

// detect-backtracking-rerender by default is debug build only
// detect-glimmer-allow-backtracking-rerender can be enabled in custom builds
if (isFeatureEnabled('ember-glimmer-detect-backtracking-rerender') ||
    isFeatureEnabled('ember-glimmer-allow-backtracking-rerender')) {
  let counter = 0;
  let inTransaction = false;
  let shouldReflush;
  let debugStack;

  runInTransaction = (context, methodName) => {
    shouldReflush = false;
    inTransaction = true;
    runInDebug(() => {
      debugStack = context.env.debugStack;
    });
    context[methodName]();
    inTransaction = false;
    counter++;
    return shouldReflush;
  };

  didRender = (object, key, reference) => {
    if (!inTransaction) { return; }
    let meta = metaFor(object);
    let lastRendered = meta.writableLastRendered();
    lastRendered[key] = counter;

    runInDebug(() => {
      let referenceMap = meta.writableLastRenderedReferenceMap();
      referenceMap[key] = reference;

      let templateMap = meta.writableLastRenderedTemplateMap();
      if (templateMap[key] === undefined) {
        templateMap[key] = debugStack.peek();
      }
    });
  };

  assertNotRendered = (object, key, _meta) => {
    let meta = _meta || metaFor(object);
    let lastRendered = meta.readableLastRendered();

    if (lastRendered && lastRendered[key] === counter) {
      runInDebug(() => {
        let templateMap = meta.readableLastRenderedTemplateMap();
        let lastRenderedIn = templateMap[key];
        let currentlyIn = debugStack.peek();

        let referenceMap = meta.readableLastRenderedReferenceMap();
        let lastRef = referenceMap[key];
        let parts = [];
        let label;

        if (lastRef) {
          while (lastRef && lastRef._propertyKey) {
            parts.unshift(lastRef._propertyKey);
            lastRef = lastRef._parentReference;
          }

          label = parts.join('.');
        } else {
          label = 'the same value';
        }

        let message = `You modified "${label}" twice on ${object} in a single render. It was rendered in ${lastRenderedIn} and modified in ${currentlyIn}. This was unreliable and slow in Ember 1.x and`;

        if (isFeatureEnabled('ember-glimmer-allow-backtracking-rerender')) {
          deprecate(`${message} will be removed in Ember 3.0.`, false, { id: 'ember-views.render-double-modify', until: '3.0.0' });
        } else {
          assert(`${message} is no longer supported. See https://github.com/emberjs/ember.js/issues/13948 for more details.`, false);
        }
      });

      shouldReflush = true;
    }
  };
} else {
  // in production do nothing to detect reflushes
  runInTransaction = (context, methodName) => {
    context[methodName]();
    return false;
  };
}

export { runInTransaction as default, didRender, assertNotRendered };
