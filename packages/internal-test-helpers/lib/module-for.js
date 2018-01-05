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

      return all(promises);
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
