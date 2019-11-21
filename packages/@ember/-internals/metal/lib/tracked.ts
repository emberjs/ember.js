import { getDebugName, isEmberArray } from '@ember/-internals/utils';
import { assert, deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { combine, CONSTANT_TAG, Tag, UpdatableTag, update } from '@glimmer/validator';
import { Decorator, DecoratorPropertyDescriptor, isElementDescriptor } from './decorator';
import { setClassicDecorator } from './descriptor_map';
import { markObjectAsDirty, tagForProperty } from './tags';

type Option<T> = T | null;

interface AutotrackingTransactionSourceData {
  context?: string;
  error: Error;
}

let DEPRECATE_IN_AUTOTRACKING_TRANSACTION = false;
let AUTOTRACKING_TRANSACTION: WeakMap<Tag, AutotrackingTransactionSourceData> | null = null;

export let runInAutotrackingTransaction: undefined | ((fn: () => void) => void);
export let deprecateMutationsInAutotrackingTransaction: undefined | ((fn: () => void) => void);

let debuggingContexts: string[] | undefined;

export let assertTagNotConsumed:
  | undefined
  | ((tag: Tag, obj: object, keyName?: string, forHardError?: boolean) => void);

let markTagAsConsumed: undefined | ((_tag: Tag, sourceError: Error) => void);

if (DEBUG) {
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
  runInAutotrackingTransaction = (fn: () => void) => {
    let previousDeprecateState = DEPRECATE_IN_AUTOTRACKING_TRANSACTION;
    let previousTransactionState = AUTOTRACKING_TRANSACTION;

    DEPRECATE_IN_AUTOTRACKING_TRANSACTION = false;

    if (previousTransactionState === null) {
      // if there was no transaction start it. Otherwise, the transaction already exists.
      AUTOTRACKING_TRANSACTION = new WeakMap();
    }

    try {
      fn();
    } finally {
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

  let makeAutotrackingErrorMessage = (
    sourceData: AutotrackingTransactionSourceData,
    obj: object,
    keyName?: string
  ) => {
    let dirtyString = keyName
      ? `\`${keyName}\` on \`${getDebugName!(obj)}\``
      : `\`${getDebugName!(obj)}\``;

    let message = [
      `You attempted to update ${dirtyString}, but it had already been used previously in the same computation.  Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.`,
    ];

    if (sourceData.context) {
      message.push(`\`${keyName}\` was first used:\n\n${sourceData.context}`);
    }

    if (sourceData.error.stack) {
      let sourceStack = sourceData.error.stack;
      let thirdIndex = nthIndex(sourceStack, '\n', 3);
      sourceStack = sourceStack.substr(thirdIndex);

      message.push(`Stack trace for the first usage: ${sourceStack}`);
    }

    message.push(`Stack trace for the update:`);

    return message.join('\n\n');
  };

  debuggingContexts = [];

  markTagAsConsumed = (_tag: Tag, sourceError: Error) => {
    if (!AUTOTRACKING_TRANSACTION || AUTOTRACKING_TRANSACTION.has(_tag)) return;

    AUTOTRACKING_TRANSACTION.set(_tag, {
      context: debuggingContexts!.map(c => c.replace(/^/gm, '  ').replace(/^ /, '-')).join('\n\n'),
      error: sourceError,
    });

    // We need to mark the tag and all of its subtags as consumed, so we need to
    // cast in and access its internals. In the future this shouldn't be necessary,
    // this is only for computed properties.e
    let tag = _tag as any;

    if (tag.subtag) {
      markTagAsConsumed!(tag.subtag, sourceError);
    }

    if (tag.subtags) {
      tag.subtags.forEach((tag: Tag) => markTagAsConsumed!(tag, sourceError));
    }
  };

  assertTagNotConsumed = (tag: Tag, obj: object, keyName?: string, forceHardError = false) => {
    if (AUTOTRACKING_TRANSACTION === null) return;

    let sourceData = AUTOTRACKING_TRANSACTION.get(tag);

    if (!sourceData) return;

    if (DEPRECATE_IN_AUTOTRACKING_TRANSACTION && !forceHardError) {
      deprecate(makeAutotrackingErrorMessage(sourceData, obj, keyName), false, {
        id: 'autotracking.mutation-after-consumption',
        until: '4.0.0',
      });
    } else {
      // This hack makes the assertion message nicer, we can cut off the first
      // few lines of the stack trace and let users know where the actual error
      // occurred.
      try {
        assert(makeAutotrackingErrorMessage(sourceData, obj, keyName), false);
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

/**
  An object that that tracks @tracked properties that were consumed.

  @private
*/
export class Tracker {
  private tags = new Set<Tag>();
  private last: Option<Tag> = null;

  add(tag: Tag): void {
    this.tags.add(tag);

    if (DEBUG) {
      markTagAsConsumed!(tag, new Error());
    }

    this.last = tag;
  }

  get size(): number {
    return this.tags.size;
  }

  combine(): Tag {
    if (this.tags.size === 0) {
      return CONSTANT_TAG;
    } else if (this.tags.size === 1) {
      return this.last as Tag;
    } else {
      let tags: Tag[] = [];
      this.tags.forEach(tag => tags.push(tag));
      return combine(tags);
    }
  }
}

/**
  @decorator
  @private

  Marks a property as tracked.

  By default, a component's properties are expected to be static,
  meaning you are not able to update them and have the template update accordingly.
  Marking a property as tracked means that when that property changes,
  a rerender of the component is scheduled so the template is kept up to date.

  There are two usages for the `@tracked` decorator, shown below.

  @example No dependencies

  If you don't pass an argument to `@tracked`, only changes to that property
  will be tracked:

  ```typescript
  import Component, { tracked } from '@glimmer/component';

  export default class MyComponent extends Component {
    @tracked
    remainingApples = 10
  }
  ```

  When something changes the component's `remainingApples` property, the rerender
  will be scheduled.

  @example Dependents

  In the case that you have a computed property that depends other
  properties, you want to track both so that when one of the
  dependents change, a rerender is scheduled.

  In the following example we have two properties,
  `eatenApples`, and `remainingApples`.

  ```typescript
  import Component, { tracked } from '@glimmer/component';

  const totalApples = 100;

  export default class MyComponent extends Component {
    @tracked
    eatenApples = 0

    @tracked('eatenApples')
    get remainingApples() {
      return totalApples - this.eatenApples;
    }

    increment() {
      this.eatenApples = this.eatenApples + 1;
    }
  }
  ```

  @param dependencies Optional dependents to be tracked.
*/
export function tracked(propertyDesc: { value: any; initializer: () => any }): Decorator;
export function tracked(
  target: object,
  key: string,
  desc: DecoratorPropertyDescriptor
): DecoratorPropertyDescriptor;
export function tracked(...args: any[]): Decorator | DecoratorPropertyDescriptor {
  assert(
    `@tracked can only be used directly as a native decorator. If you're using tracked in classic classes, add parenthesis to call it like a function: tracked()`,
    !(isElementDescriptor(args.slice(0, 3)) && args.length === 5 && args[4] === true)
  );

  if (!isElementDescriptor(args)) {
    let propertyDesc = args[0];

    assert(
      `tracked() may only receive an options object containing 'value' or 'initializer', received ${propertyDesc}`,
      args.length === 0 || (typeof propertyDesc === 'object' && propertyDesc !== null)
    );

    if (DEBUG && propertyDesc) {
      let keys = Object.keys(propertyDesc);

      assert(
        `The options object passed to tracked() may only contain a 'value' or 'initializer' property, not both. Received: [${keys}]`,
        keys.length <= 1 &&
          (keys[0] === undefined || keys[0] === 'value' || keys[0] === 'initializer')
      );

      assert(
        `The initializer passed to tracked must be a function. Received ${propertyDesc.initializer}`,
        !('initializer' in propertyDesc) || typeof propertyDesc.initializer === 'function'
      );
    }

    let initializer = propertyDesc ? propertyDesc.initializer : undefined;
    let value = propertyDesc ? propertyDesc.value : undefined;

    let decorator = function(
      target: object,
      key: string,
      _desc: DecoratorPropertyDescriptor,
      _meta?: any,
      isClassicDecorator?: boolean
    ): DecoratorPropertyDescriptor {
      assert(
        `You attempted to set a default value for ${key} with the @tracked({ value: 'default' }) syntax. You can only use this syntax with classic classes. For native classes, you can use class initializers: @tracked field = 'default';`,
        isClassicDecorator
      );

      let fieldDesc = {
        initializer: initializer || (() => value),
      };

      return descriptorForField([target, key, fieldDesc]);
    };

    setClassicDecorator(decorator);

    return decorator;
  }

  return descriptorForField(args);
}

if (DEBUG) {
  // Normally this isn't a classic decorator, but we want to throw a helpful
  // error in development so we need it to treat it like one
  setClassicDecorator(tracked);
}

function descriptorForField([_target, key, desc]: [
  object,
  string,
  DecoratorPropertyDescriptor
]): DecoratorPropertyDescriptor {
  assert(
    `You attempted to use @tracked on ${key}, but that element is not a class field. @tracked is only usable on class fields. Native getters and setters will autotrack add any tracked fields they encounter, so there is no need mark getters and setters with @tracked.`,
    !desc || (!desc.value && !desc.get && !desc.set)
  );

  let initializer = desc ? desc.initializer : undefined;
  let values = new WeakMap();
  let hasInitializer = typeof initializer === 'function';

  return {
    enumerable: true,
    configurable: true,

    get(): any {
      let propertyTag = tagForProperty(this, key) as UpdatableTag;

      consume(propertyTag);

      let value;

      // If the field has never been initialized, we should initialize it
      if (hasInitializer && !values.has(this)) {
        value = initializer.call(this);

        values.set(this, value);
      } else {
        value = values.get(this);
      }

      // Add the tag of the returned value if it is an array, since arrays
      // should always cause updates if they are consumed and then changed
      if (Array.isArray(value) || isEmberArray(value)) {
        update(propertyTag, tagForProperty(value, '[]'));
      }

      return value;
    },

    set(newValue: any): void {
      if (DEBUG) {
        // No matter what, attempting to update a tracked property in an
        // autotracking context after it has been read is invalid, even if we
        // are otherwise warning, so always assert.
        assertTagNotConsumed!(tagForProperty(this, key), this, key, true);
      }

      markObjectAsDirty(this, key);

      values.set(this, newValue);

      if (propertyDidChange !== null) {
        propertyDidChange();
      }
    },
  };
}

/**
  @private

  Whenever a tracked computed property is entered, the current tracker is
  saved off and a new tracker is replaced.

  Any tracked properties consumed are added to the current tracker.

  When a tracked computed property is exited, the tracker's tags are
  combined and added to the parent tracker.

  The consequence is that each tracked computed property has a tag
  that corresponds to the tracked properties consumed inside of
  itself, including child tracked computed properties.
*/
let CURRENT_TRACKER: Option<Tracker> = null;

export function track(callback: () => void, debuggingContext?: string | false) {
  // Note: debuggingContext is allowed to be false so `DEBUG && 'debug message'` works

  let parent = CURRENT_TRACKER;
  let current = new Tracker();

  CURRENT_TRACKER = current;

  try {
    if (DEBUG) {
      if (debuggingContext) {
        debuggingContexts!.unshift(debuggingContext);
      }
      runInAutotrackingTransaction!(callback);
    } else {
      callback();
    }
  } finally {
    if (DEBUG && debuggingContext) {
      debuggingContexts!.shift();
    }
    CURRENT_TRACKER = parent;
  }

  return current.combine();
}

export function consume(tag: Tag) {
  if (CURRENT_TRACKER !== null) {
    CURRENT_TRACKER.add(tag);
  }
}

export function isTracking() {
  return CURRENT_TRACKER !== null;
}

export function untrack(callback: () => void) {
  let parent = CURRENT_TRACKER;
  CURRENT_TRACKER = null;

  try {
    callback();
  } finally {
    CURRENT_TRACKER = parent;
  }
}

export type Key = string;

export interface Interceptors {
  [key: string]: boolean;
}

let propertyDidChange: (() => void) | null = null;

export function setPropertyDidChange(cb: () => void): void {
  propertyDidChange = cb;
}

export class UntrackedPropertyError extends Error {
  static for(obj: any, key: string): UntrackedPropertyError {
    return new UntrackedPropertyError(
      obj,
      key,
      `The property '${key}' on ${obj} was changed after being rendered. If you want to change a property used in a template after the component has rendered, mark the property as a tracked property with the @tracked decorator.`
    );
  }

  constructor(public target: any, public key: string, message: string) {
    super(message);
  }
}

/**
 * Function that can be used in development mode to generate more meaningful
 * error messages.
 */
export interface UntrackedPropertyErrorThrower {
  (obj: any, key: string): void;
}
