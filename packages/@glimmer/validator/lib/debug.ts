import { Tag } from './validators';
import { DEBUG } from '@glimmer/env';

interface AutotrackingTransactionSourceData {
  context?: string;
}

export let runInAutotrackingTransaction:
  | undefined
  | ((fn: () => void, debuggingContext?: string | false) => void);
export let deprecateMutationsInAutotrackingTransaction: undefined | ((fn: () => void) => void);
export let setAutotrackingTransactionEnv:
  | undefined
  | ((env: {
      assert?(message: string): void;
      deprecate?(message: string): void;
      debugMessage?(obj?: unknown, keyName?: string): string;
    }) => void);

export let assertTagNotConsumed:
  | undefined
  | (<T>(tag: Tag, obj?: T, keyName?: keyof T | string | symbol, forceHardError?: boolean) => void);

export let markTagAsConsumed: undefined | ((_tag: Tag) => void);

if (DEBUG) {
  let DEPRECATE_IN_AUTOTRACKING_TRANSACTION = false;
  let AUTOTRACKING_TRANSACTION: WeakMap<Tag, AutotrackingTransactionSourceData> | null = null;

  let debuggingContexts: string[] = [];

  /////////

  let TRANSACTION_ENV = {
    assert(message: string): void {
      throw new Error(message);
    },

    deprecate(message: string): void {
      console.warn(message);
    },

    debugMessage(obj?: unknown, keyName?: string) {
      let objName;

      if (typeof obj === 'function') {
        objName = obj.name;
      } else if (typeof obj === 'object' && obj !== null) {
        let className = (obj.constructor && obj.constructor.name) || '(unknown class)';

        objName = `(an instance of ${className})`;
      } else if (obj === undefined) {
        objName = '(an unknown tag)';
      } else {
        objName = String(obj);
      }

      let dirtyString = keyName ? `\`${keyName}\` on \`${objName}\`` : `\`${objName}\``;

      return `You attempted to update ${dirtyString}, but it had already been used previously in the same computation.  Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.`;
    },
  };

  setAutotrackingTransactionEnv = env => Object.assign(TRANSACTION_ENV, env);

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
  runInAutotrackingTransaction = (fn: () => void, debuggingContext?: string | false) => {
    let previousDeprecateState = DEPRECATE_IN_AUTOTRACKING_TRANSACTION;
    let previousTransactionState = AUTOTRACKING_TRANSACTION;

    DEPRECATE_IN_AUTOTRACKING_TRANSACTION = false;

    if (previousTransactionState === null) {
      // if there was no transaction start it. Otherwise, the transaction already exists.
      AUTOTRACKING_TRANSACTION = new WeakMap();
    }

    if (debuggingContext) {
      debuggingContexts!.unshift(debuggingContext);
    }

    try {
      fn();
    } finally {
      if (debuggingContext) {
        debuggingContexts!.shift();
      }

      DEPRECATE_IN_AUTOTRACKING_TRANSACTION = previousDeprecateState;
      AUTOTRACKING_TRANSACTION = previousTransactionState;
    }
  };

  /**
   * Switches to deprecating within an autotracking transaction, if one exists.
   * If `runInAutotrackingTransaction` is called within the callback of this
   * method, it switches back to throwing an error, allowing zebra-striping of
   * the types of errors that are thrown.
   *
   * Does not start an autotracking transaction.
   *
   * NOTE: For Ember usage only, in general you should assert that these
   * invariants are true.
   */
  deprecateMutationsInAutotrackingTransaction = (fn: () => void) => {
    let previousDeprecateState = DEPRECATE_IN_AUTOTRACKING_TRANSACTION;
    DEPRECATE_IN_AUTOTRACKING_TRANSACTION = true;

    try {
      fn();
    } finally {
      DEPRECATE_IN_AUTOTRACKING_TRANSACTION = previousDeprecateState;
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

  let makeAutotrackingErrorMessage = <T>(
    sourceData: AutotrackingTransactionSourceData,
    obj?: T,
    keyName?: keyof T | string | symbol
  ) => {
    let message = [TRANSACTION_ENV.debugMessage(obj, keyName && String(keyName))];

    if (sourceData.context) {
      message.push(`\`${String(keyName)}\` was first used:\n\n${sourceData.context}`);
    }

    message.push(`Stack trace for the update:`);

    return message.join('\n\n');
  };

  markTagAsConsumed = (_tag: Tag) => {
    if (!AUTOTRACKING_TRANSACTION || AUTOTRACKING_TRANSACTION.has(_tag)) return;

    AUTOTRACKING_TRANSACTION.set(_tag, {
      context: debuggingContexts!.map(c => c.replace(/^/gm, '  ').replace(/^ /, '-')).join('\n\n'),
    });

    // We need to mark the tag and all of its subtags as consumed, so we need to
    // cast it and access its internals. In the future this shouldn't be necessary,
    // this is only for computed properties.
    let tag = _tag as any;

    if (tag.subtag) {
      markTagAsConsumed!(tag.subtag);
    }

    if (tag.subtags) {
      tag.subtags.forEach((tag: Tag) => markTagAsConsumed!(tag));
    }
  };

  assertTagNotConsumed = <T>(
    tag: Tag,
    obj?: T,
    keyName?: keyof T | string | symbol,
    forceHardError: boolean | undefined = false
  ) => {
    if (AUTOTRACKING_TRANSACTION === null) return;

    let sourceData = AUTOTRACKING_TRANSACTION.get(tag);

    if (!sourceData) return;

    if (DEPRECATE_IN_AUTOTRACKING_TRANSACTION && !forceHardError) {
      TRANSACTION_ENV.deprecate(makeAutotrackingErrorMessage(sourceData, obj, keyName));
    } else {
      // This hack makes the assertion message nicer, we can cut off the first
      // few lines of the stack trace and let users know where the actual error
      // occurred.
      try {
        TRANSACTION_ENV.assert(makeAutotrackingErrorMessage(sourceData, obj, keyName));
      } catch (e) {
        if (e.stack) {
          let updateStackBegin = e.stack.indexOf('Stack trace for the update:');

          if (updateStackBegin !== -1) {
            let start = nthIndex(e.stack, '\n', 1, updateStackBegin);
            let end = nthIndex(e.stack, '\n', 4, updateStackBegin);
            e.stack = e.stack.substr(0, start) + e.stack.substr(end);
          }
        }

        throw e;
      }
    }
  };
}
