import { DEBUG } from '@glimmer/env';
/* eslint-disable @typescript-eslint/no-non-null-assertion -- @fixme */
import type { Tag } from '@glimmer/interfaces';
import { asPresentArray, getLast } from '@glimmer/debug-util/lib/present';
import { assert } from '@glimmer/global-context';

interface DebugTransaction {
  beginTrackingTransaction?:
    | undefined
    | ((debuggingContext?: string | false, deprecate?: boolean) => void);
  endTrackingTransaction?: undefined | (() => void);
  runInTrackingTransaction?: undefined | (<T>(fn: () => T, debuggingContext?: string | false) => T);

  resetTrackingTransaction?: undefined | (() => string);
  setTrackingTransactionEnv?:
    | undefined
    | ((env: { debugMessage?(obj?: unknown, keyName?: string): string }) => void);
  assertTagNotConsumed?:
    | undefined
    | (<T>(tag: Tag, obj?: T, keyName?: keyof T | string | symbol) => void);

  markTagAsConsumed?: undefined | ((_tag: Tag) => void);

  logTrackingStack?: undefined | ((transaction?: Transaction) => string);
}

export const debug: DebugTransaction = {};

interface Transaction {
  parent: Transaction | null;
  debugLabel?: string | undefined;
}

if (DEBUG) {
  let CONSUMED_TAGS: WeakMap<Tag, Transaction> | null = null;

  const TRANSACTION_STACK: Transaction[] = [];

  /////////

  const TRANSACTION_ENV = {
    debugMessage(obj?: unknown, keyName?: string) {
      let objName;

      if (typeof obj === 'function') {
        objName = obj.name;
      } else if (typeof obj === 'object' && obj !== null) {
        let className = obj.constructor.name || '(unknown class)';

        objName = `(an instance of ${className})`;
      } else if (obj === undefined) {
        objName = '(an unknown tag)';
      } else {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        objName = String(obj);
      }

      let dirtyString = keyName ? `\`${keyName}\` on \`${objName}\`` : `\`${objName}\``;

      return `You attempted to update ${dirtyString}, but it had already been used previously in the same computation.  Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.`;
    },
  };

  debug.setTrackingTransactionEnv = (env) => Object.assign(TRANSACTION_ENV, env);

  debug.beginTrackingTransaction = (_debugLabel?: string | false) => {
    CONSUMED_TAGS = CONSUMED_TAGS || new WeakMap();

    let debugLabel = _debugLabel || undefined;

    let parent = TRANSACTION_STACK[TRANSACTION_STACK.length - 1] ?? null;

    TRANSACTION_STACK.push({
      parent,
      debugLabel,
    });
  };

  debug.endTrackingTransaction = () => {
    if (TRANSACTION_STACK.length === 0) {
      throw new Error('attempted to close a tracking transaction, but one was not open');
    }

    TRANSACTION_STACK.pop();

    if (TRANSACTION_STACK.length === 0) {
      CONSUMED_TAGS = null;
    }
  };

  debug.resetTrackingTransaction = () => {
    let stack = '';

    if (TRANSACTION_STACK.length > 0) {
      stack = debug.logTrackingStack!(TRANSACTION_STACK[TRANSACTION_STACK.length - 1]);
    }

    TRANSACTION_STACK.splice(0, TRANSACTION_STACK.length);
    CONSUMED_TAGS = null;

    return stack;
  };

  /**
   * Creates a global autotracking transaction. This will prevent any backflow
   * in any `track` calls within the transaction, even if they are not
   * externally consumed.
   *
   * `runInAutotrackingTransaction` can be called within itself, and it will add
   * onto the existing transaction if one exists.
   *
   * TODO: Only throw an error if the `track` is consumed.
   */
  debug.runInTrackingTransaction = <T>(fn: () => T, debugLabel?: string | false) => {
    debug.beginTrackingTransaction!(debugLabel);
    let didError = true;

    try {
      let value = fn();
      didError = false;
      return value;
    } finally {
      if (!didError) {
        debug.endTrackingTransaction!();
      }

      // if (id !== TRANSACTION_STACK.length) {
      //   throw new Error(
      //     `attempted to close a tracking transaction (${id}), but it was not the last transaction (${TRANSACTION_STACK.length})`
      //   );
      // }
    }
  };

  let nthIndex = (str: string, pattern: string, n: number, startingPos = -1) => {
    let i = startingPos;

    while (n-- > 0 && i++ < str.length) {
      i = str.indexOf(pattern, i);
      if (i < 0) break;
    }

    return i;
  };

  let makeTrackingErrorMessage = <T>(
    transaction: Transaction,
    obj?: T,
    keyName?: keyof T | string | symbol
  ) => {
    let message = [TRANSACTION_ENV.debugMessage(obj, keyName && String(keyName))];

    message.push(`\`${String(keyName)}\` was first used:`);

    message.push(debug.logTrackingStack!(transaction));

    message.push(`Stack trace for the update:`);

    return message.join('\n\n');
  };

  debug.logTrackingStack = (transaction?: Transaction) => {
    let trackingStack = [];
    let current: Transaction | null | undefined =
      transaction || TRANSACTION_STACK[TRANSACTION_STACK.length - 1];

    if (current === undefined) return '';

    while (current) {
      if (current.debugLabel) {
        trackingStack.unshift(current.debugLabel);
      }

      current = current.parent;
    }

    return trackingStack.map((label, index) => ' '.repeat(2 * index) + label).join('\n');
  };

  debug.markTagAsConsumed = (_tag: Tag) => {
    if (!CONSUMED_TAGS) return;

    let mark = debug.markTagAsConsumed!;

    if (Array.isArray(_tag)) {
      _tag.forEach(mark);
      return;
    }

    if (CONSUMED_TAGS.has(_tag)) return;

    CONSUMED_TAGS.set(_tag, getLast(asPresentArray(TRANSACTION_STACK)));

    /**
     * A write to a tag below `_tag` also counts as a write after a read.
     *
     * The fields belong to `TagNode` in `tags.ts`.
     */
    let node = _tag as unknown as { deps: { dep: Tag; nextDep: unknown } | undefined };

    for (let dep = node.deps; dep !== undefined; dep = dep.nextDep as typeof dep) {
      mark(dep.dep);
    }
  };

  debug.assertTagNotConsumed = <T>(tag: Tag, obj?: T, keyName?: keyof T | string | symbol) => {
    if (CONSUMED_TAGS === null) return;

    let transaction = CONSUMED_TAGS.get(tag);

    if (!transaction) return;

    // This hack makes the assertion message nicer, we can cut off the first
    // few lines of the stack trace and let users know where the actual error
    // occurred.
    try {
      assert(false, makeTrackingErrorMessage(transaction, obj, keyName));
    } catch (e) {
      if (hasStack(e)) {
        let updateStackBegin = e.stack.indexOf('Stack trace for the update:');

        if (updateStackBegin !== -1) {
          let start = nthIndex(e.stack, '\n', 1, updateStackBegin);
          let end = nthIndex(e.stack, '\n', 4, updateStackBegin);

          e.stack = e.stack.substr(0, start) + e.stack.substr(end);
        }
      }

      throw e;
    }
  };
}

function hasStack(error: unknown): error is { stack: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'stack' in error &&
    typeof error.stack === 'string'
  );
}
