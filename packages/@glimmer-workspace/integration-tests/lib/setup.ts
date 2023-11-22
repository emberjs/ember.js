import type { Destroyable, Destructor, Dict, Nullable } from '@glimmer/interfaces';
import type { IteratorDelegate } from '@glimmer/reference';
import type { TestBase } from 'qunit';
import setGlobalContext from '@glimmer/global-context';
import { consumeTag, dirtyTagFor, tagFor } from '@glimmer/validator';

import { scheduleDidDestroy, scheduleWillDestroy } from './base-env';
import { NativeIteratorDelegate } from './modes/env';

let actualDeprecations: string[] = [];

// Override the types on Assert to add our own helper
declare global {
  interface Assert {
    validateDeprecations(...expected: (string | RegExp)[]): void;
  }
}

QUnit.assert.validateDeprecations = function (...expectedDeprecations: (string | RegExp)[]) {
  if (actualDeprecations.length !== expectedDeprecations.length) {
    this.pushResult({
      result: false,
      actual: actualDeprecations.length,
      expected: expectedDeprecations.length,
      message: 'Expected number of deprecations matches actual number of deprecations',
    });
  }

  actualDeprecations.forEach((actual, i) => {
    let expected = expectedDeprecations[i] as string | RegExp;

    let result = expected instanceof RegExp ? Boolean(expected.test(actual)) : actual === expected;

    this.pushResult({
      result,
      actual,
      expected,
      message: `Deprecation ${i + 1} matches: "${actual}"`,
    });
  });

  actualDeprecations = [];
};

QUnit.testStart(() => {
  let test = QUnit.config.current as TestBase & Assert;
  let finish = test.finish;

  test.finish = function (...args: Parameters<TestBase['finish']>) {
    if (actualDeprecations.length > 0) {
      test.expected = test.expected === null ? 1 : test.expected + 1;

      test.pushResult({
        result: false,
        actual: false,
        expected: true,
        message: `Test contained deprecations, but \`assert.validateDeprecations\` was not called. Deprecations were: \n\n - ${actualDeprecations.join(
          '\n\n - '
        )}`,
      });

      actualDeprecations = [];
    }

    return finish.call(this, ...args);
  };
});

setGlobalContext({
  scheduleRevalidate() {},

  scheduleDestroy<T extends Destroyable>(destroyable: T, destructor: Destructor<T>) {
    scheduleWillDestroy({ destroyable, destructor });
  },

  scheduleDestroyed(fn: () => void) {
    scheduleDidDestroy(fn);
  },

  toBool(value) {
    return Boolean(value);
  },

  toIterator(value: any): Nullable<IteratorDelegate> {
    if (value && value[Symbol.iterator]) {
      return NativeIteratorDelegate.from(value);
    }

    return null;
  },

  getProp(obj: unknown, key: string): unknown {
    if (typeof obj === 'object' && obj !== null) {
      consumeTag(tagFor(obj, key));
    }

    return (obj as Dict)[key];
  },

  setProp(obj: unknown, key: string, value: unknown): unknown {
    if (typeof obj === 'object' && obj !== null) {
      dirtyTagFor(obj, key);
    }

    return ((obj as Dict)[key] = value);
  },

  getPath(obj: unknown, path: string) {
    let parts = path.split('.');

    let current: unknown = obj;

    for (let part of parts) {
      if (current !== null && current !== undefined) {
        current = (current as Record<string, unknown>)[part];
      }
    }

    return current;
  },

  setPath(obj: unknown, path: string, value: unknown) {
    let parts = path.split('.');

    let current: unknown = obj;
    let pathToSet = parts.pop()!;

    for (let part of parts) {
      current = (current as Record<string, unknown>)[part];
    }

    (current as Record<string, unknown>)[pathToSet] = value;
  },

  warnIfStyleNotTrusted() {},

  assert(test: unknown, msg: string) {
    if (!test) {
      throw new Error(msg);
    }
  },

  deprecate(msg: string, test: unknown) {
    if (!test) {
      actualDeprecations.push(msg);
    }
  },
});
