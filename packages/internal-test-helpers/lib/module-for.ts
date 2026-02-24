/* globals URLSearchParams */
import { isEnabled } from '@ember/canary-features';
import { assertDestroyablesDestroyed, enableDestroyableTracking } from '@glimmer/destroyable';

import { all } from 'rsvp';
import type { Generator, Mixin } from './apply-mixins';
import applyMixins from './apply-mixins';
import getAllPropertyNames from './get-all-property-names';
import type { TestCase } from './test-cases/abstract';
import { setContext, unsetContext } from './test-context';
import { setupAssertionHelpers } from './ember-dev/assertion';
import { setupContainersCheck } from './ember-dev/containers';
import { setupDeprecationHelpers } from './ember-dev/deprecation';
import { setupNamespacesCheck } from './ember-dev/namespaces';
import { setupObserversCheck } from './ember-dev/observers';
import { setupRunLoopCheck } from './ember-dev/run-loop';
import { setupWarningHelpers } from './ember-dev/warning';
import { getDebugFunction, setDebugFunction } from '@ember/debug';
import type { DebugEnv } from './ember-dev/utils';

interface TestClass<T extends TestCase> {
  new (assert: QUnit['assert']): T;
}

interface TestContext<T extends TestCase> {
  instance: T | null | undefined;
}

const ASSERT_DESTROYABLES = (() => {
  if (typeof URLSearchParams === 'undefined' || typeof document !== 'object') {
    return false;
  }

  let queryParams = new URLSearchParams(document.location.search.substring(1));
  let assertDestroyables = queryParams.get('assertDestroyables');

  return assertDestroyables !== null;
})();

export function moduleForDevelopment<T extends TestCase, M extends Generator>(
  description: string,
  TestClass: TestClass<T>,
  ...mixins: Mixin<M>[]
) {
  if (import.meta.env.MODE === 'development') {
    moduleFor(description, TestClass, ...mixins);
  }
}

export async function define<T>(callback: () => T): Promise<T> {
  const result = callback();
  await Promise.resolve();
  return result;
}

export default function moduleFor<T extends TestCase, M extends Generator>(
  description: string,
  TestClass: TestClass<T>,
  ...mixins: Mixin<M>[]
) {
  let env = {
    getDebugFunction,
    setDebugFunction,
  } as DebugEnv;

  QUnit.module(description, function (hooks) {
    setupContainersCheck(hooks);
    setupNamespacesCheck(hooks);
    setupObserversCheck(hooks);
    setupRunLoopCheck(hooks);
    setupAssertionHelpers(hooks, env);
    setupDeprecationHelpers(hooks, env);
    setupWarningHelpers(hooks, env);
    setupTestClass(hooks, TestClass, ...mixins);
  });
}

function afterEachFinally() {
  unsetContext();

  if (import.meta.env?.DEV && ASSERT_DESTROYABLES) {
    assertDestroyablesDestroyed!();
  }
}

export function setupTestClass<T extends TestCase, G extends Generator>(
  hooks: NestedHooks,
  TestClass: TestClass<T>,
  ...mixins: Mixin<G>[]
) {
  hooks.beforeEach(function (this: TestContext<T>, assert: QUnit['assert']) {
    if (import.meta.env?.DEV && ASSERT_DESTROYABLES) {
      enableDestroyableTracking!();
    }

    let instance = new TestClass(assert);
    this.instance = instance;

    setContext(instance);

    if (instance.beforeEach) {
      return instance.beforeEach(assert);
    }
  });

  hooks.afterEach(function (this: TestContext<T>) {
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

  let properties = getAllPropertyNames<T>(TestClass);
  properties.forEach((name) => generateTest<T>(name));

  function shouldTest(features: string[]) {
    return features.every((feature) => {
      if (feature[0] === '!') {
        return !isEnabled(feature.slice(1));
      } else {
        return isEnabled(feature);
      }
    });
  }

  function generateTest<T extends TestCase>(name: keyof T & string) {
    if (name.indexOf('@test ') === 0) {
      QUnit.test(name.slice(5), function (this: TestContext<T>, assert) {
        return (this.instance![name] as any)(assert);
      });
    } else if (name.indexOf('@only ') === 0) {
      // eslint-disable-next-line qunit/no-only
      QUnit.only(name.slice(5), function (this: TestContext<T>, assert) {
        return (this.instance![name] as any)(assert);
      });
    } else if (name.indexOf('@skip ') === 0) {
      QUnit.skip(name.slice(5), function (this: TestContext<T>, assert) {
        return (this.instance![name] as any)(assert);
      });
    } else {
      let match = /^@feature\(([A-Z_a-z-! ,]+)\) /.exec(name);

      if (match) {
        let features = match[1]!.replace(/ /g, '').split(',');

        if (shouldTest(features)) {
          QUnit.test(name.slice(match[0]!.length), function (this: TestContext<T>, assert) {
            return (this.instance![name] as any)(assert);
          });
        }
      }
    }
  }
}
