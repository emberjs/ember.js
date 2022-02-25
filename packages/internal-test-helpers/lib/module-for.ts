/* globals URLSearchParams */
import { DEBUG } from '@glimmer/env';
import { isEnabled } from '@ember/canary-features';
import applyMixins, { Mixin, Generator } from './apply-mixins';
import getAllPropertyNames from './get-all-property-names';
import { setContext, unsetContext } from './test-context';
import { all } from 'rsvp';
import { enableDestroyableTracking, assertDestroyablesDestroyed } from '@glimmer/destroyable';
import AbstractTestCase from './test-cases/abstract';

interface TestClass<T extends AbstractTestCase> {
  new (assert: QUnit['assert']): T;
}

interface TestContext {
  instance: AbstractTestCase | null | undefined;
}

const ASSERT_DESTROYABLES = (() => {
  if (typeof URLSearchParams === 'undefined' || typeof document !== 'object') {
    return false;
  }

  let queryParams = new URLSearchParams(document.location.search.substring(1));
  let assertDestroyables = queryParams.get('assertDestroyables');

  return assertDestroyables !== null;
})();

export default function moduleFor<T extends AbstractTestCase, M extends Generator>(
  description: string,
  TestClass: TestClass<T>,
  ...mixins: Mixin<M>[]
) {
  QUnit.module(description, function (hooks) {
    setupTestClass(hooks, TestClass, ...mixins);
  });
}

function afterEachFinally() {
  unsetContext();

  if (DEBUG && ASSERT_DESTROYABLES) {
    assertDestroyablesDestroyed!();
  }
}

export function setupTestClass<T extends AbstractTestCase, G extends Generator>(
  hooks: NestedHooks,
  TestClass: TestClass<T>,
  ...mixins: Mixin<G>[]
) {
  hooks.beforeEach(function (this: TestContext, assert: QUnit['assert']) {
    if (DEBUG && ASSERT_DESTROYABLES) {
      enableDestroyableTracking!();
    }

    let instance = new TestClass(assert);
    this.instance = instance;

    setContext(instance);

    if (instance.beforeEach) {
      return instance.beforeEach(assert);
    }
  });

  hooks.afterEach(function (this: TestContext) {
    let promises = [];
    let instance = this.instance;
    this.instance = null;
    if (instance?.teardown) {
      promises.push(instance.teardown());
    }
    if (instance?.afterEach) {
      promises.push(instance.afterEach());
    }

    // this seems odd, but actually saves significant time
    // in the test suite
    //
    // returning a promise from a QUnit test always adds a 13ms
    // delay to the test, this filtering prevents returning a
    // promise when it is not needed
    let filteredPromises = promises.filter(Boolean);
    if (filteredPromises.length > 0) {
      return all(filteredPromises)
        .finally(afterEachFinally)
        .then(() => {});
    }

    afterEachFinally();

    return;
  });

  if (mixins.length > 0) {
    applyMixins(TestClass, ...mixins);
  }

  let properties = getAllPropertyNames(TestClass);
  properties.forEach(generateTest);

  function shouldTest(features: string[]) {
    return features.every((feature) => {
      if (feature[0] === '!') {
        return !isEnabled(feature.slice(1));
      } else {
        return isEnabled(feature);
      }
    });
  }

  function generateTest(name: string) {
    if (name.indexOf('@test ') === 0) {
      QUnit.test(name.slice(5), function (this: TestContext, assert) {
        return this.instance![name](assert);
      });
    } else if (name.indexOf('@only ') === 0) {
      // eslint-disable-next-line qunit/no-only
      QUnit.only(name.slice(5), function (this: TestContext, assert) {
        return this.instance![name](assert);
      });
    } else if (name.indexOf('@skip ') === 0) {
      QUnit.skip(name.slice(5), function (this: TestContext, assert) {
        return this.instance![name](assert);
      });
    } else {
      let match = /^@feature\(([A-Z_a-z-! ,]+)\) /.exec(name);

      if (match) {
        let features = match[1]!.replace(/ /g, '').split(',');

        if (shouldTest(features)) {
          QUnit.test(name.slice(match[0]!.length), function (this: TestContext, assert) {
            return this.instance![name](assert);
          });
        }
      }
    }
  }
}
