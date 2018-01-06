import { isFeatureEnabled } from 'ember-debug';
import applyMixins from './apply-mixins';
import { all } from 'rsvp';

export default function moduleFor(description, TestClass, ...mixins) {
  let context;

  QUnit.module(description, {
    beforeEach() {
      context = new TestClass();
      if (context.beforeEach) {
        return context.beforeEach();
      }
    },

    afterEach() {
      let promises = [];
      if (context.teardown) {
        promises.push(context.teardown());
      }
      if (context.afterEach) {
        promises.push(context.afterEach());
      }

      // this seems odd, but actually saves significant time
      // in the test suite
      //
      // returning a promise from a QUnit test always adds a 13ms
      // delay to the test, this filtering prevents returning a
      // promise when it is not needed
      //
      // Remove after we can update to QUnit that includes
      // https://github.com/qunitjs/qunit/pull/1246
      let filteredPromises = promises.filter(Boolean);
      if (filteredPromises.length > 0) {
        return all(filteredPromises);
      }
    }
  });

  applyMixins(TestClass, mixins);

  let proto = TestClass.prototype;

  while (proto !== Object.prototype) {
    Object.keys(proto).forEach(generateTest);
    proto = Object.getPrototypeOf(proto);
  }

  function shouldTest(features) {
    return features.every(feature => {
      if (feature[0] === '!' && isFeatureEnabled(feature.slice(1))) {
        return false;
      } else if (!isFeatureEnabled(feature)) {
        return false;
      } else {
        return true;
      }
    });
  }

  function generateTest(name) {
    if (name.indexOf('@test ') === 0) {
      QUnit.test(name.slice(5), assert => context[name](assert));
    } else if (name.indexOf('@skip ') === 0) {
      QUnit.skip(name.slice(5), assert => context[name](assert));
    } else {
      let match = /^@feature\(([a-z-!]+)\) /.exec(name);

      if (match) {
        let features = match[1].replace(/ /g, '').split(',');

        if (shouldTest(features)) {
          QUnit.test(name.slice(match[0].length), assert => context[name](assert));
        }
      }
    }
  }
}
