/**
 * This package contains global context functions for Glimmer. These functions
 * are set by the embedding environment and must be set before initial render.
 *
 * These functions should meet the following criteria:
 *
 * - Must be provided by the embedder, due to having framework specific
 *   behaviors (e.g. interop with classic Ember behaviors that should not be
 *   upstreamed) or to being out of scope for the VM (e.g. scheduling a
 *   revalidation)
 * - Never differ between render roots
 * - Never change over time
 *
 */

import { DEBUG } from '@glimmer/env';

//////////

/**
 * Interfaces
 *
 * TODO: Move these into @glimmer/interfaces, move @glimmer/interfaces to
 * @glimmer/internal-interfaces.
 */
interface IteratorDelegate {
  isEmpty(): boolean;
  next(): { value: unknown; memo: unknown } | null;
}

export type Destroyable = object;
export type Destructor<T extends Destroyable> = (destroyable: T) => void;

//////////

/**
 * Schedules a VM revalidation.
 *
 * Note: this has a default value so that tags can warm themselves when first loaded.
 */
export let scheduleRevalidate: () => void = () => {};

/**
 * Schedules a destructor to run
 *
 * @param destroyable The destroyable being destroyed
 * @param destructor The destructor being scheduled
 */
export let scheduleDestroy: <T extends Destroyable>(
  destroyable: T,
  destructor: Destructor<T>
) => void;

/**
 * Finalizes destruction
 *
 * @param finalizer finalizer function
 */
export let scheduleDestroyed: (finalizer: () => void) => void;

/**
 * Hook to provide iterators for `{{each}}` loops
 *
 * @param value The value to create an iterator for
 */
export let toIterator: (value: unknown) => IteratorDelegate | null;

/**
 * Hook to specify truthiness within Glimmer templates
 *
 * @param value The value to convert to a boolean
 */
export let toBool: (value: unknown) => boolean;

/**
 * Hook for specifying how Glimmer should access properties in cases where it
 * needs to. For instance, accessing an object's values in templates.
 *
 * @param obj The object provided to get a value from
 * @param path The path to get the value from
 */
export let getProp: (obj: object, path: string) => unknown;

/**
 * Hook for specifying how Glimmer should update props in cases where it needs
 * to. For instance, when updating a template reference (e.g. 2-way-binding)
 *
 * @param obj The object provided to get a value from
 * @param prop The prop to set the value at
 * @param value The value to set the value to
 */
export let setProp: (obj: object, prop: string, value: unknown) => void;

/**
 * Hook for specifying how Glimmer should access paths in cases where it needs
 * to. For instance, the `key` value of `{{each}}` loops.
 *
 * @param obj The object provided to get a value from
 * @param path The path to get the value from
 */
export let getPath: (obj: object, path: string) => unknown;

/**
 * Hook for specifying how Glimmer should update paths in cases where it needs
 * to. For instance, when updating a template reference (e.g. 2-way-binding)
 *
 * @param obj The object provided to get a value from
 * @param path The path to get the value from
 */
export let setPath: (obj: object, path: string, value: unknown) => unknown;

/**
 * Hook to warn if a style binding string or value was not marked as trusted
 * (e.g. HTMLSafe)
 */
export let warnIfStyleNotTrusted: (value: unknown) => void;

//////////

export interface GlobalContext {
  scheduleRevalidate: () => void;
  scheduleDestroy: <T extends Destroyable>(destroyable: T, destructor: Destructor<T>) => void;
  scheduleDestroyed: (finalizer: () => void) => void;
  toIterator: (value: unknown) => IteratorDelegate | null;
  toBool: (value: unknown) => boolean;
  getProp: (obj: object, path: string) => unknown;
  setProp: (obj: object, prop: string, value: unknown) => void;
  getPath: (obj: object, path: string) => unknown;
  setPath: (obj: object, prop: string, value: unknown) => void;
  warnIfStyleNotTrusted: (value: unknown) => void;
}

let globalContextWasSet = false;

export default function setGlobalContext(context: GlobalContext) {
  if (DEBUG) {
    if (globalContextWasSet) {
      throw new Error('Attempted to set the global context twice. This should only be set once.');
    }

    globalContextWasSet = true;
  }

  scheduleRevalidate = context.scheduleRevalidate;
  scheduleDestroy = context.scheduleDestroy;
  scheduleDestroyed = context.scheduleDestroyed;
  toIterator = context.toIterator;
  toBool = context.toBool;
  getProp = context.getProp;
  setProp = context.setProp;
  getPath = context.getPath;
  setPath = context.setPath;
  warnIfStyleNotTrusted = context.warnIfStyleNotTrusted;
}

export let assertGlobalContextWasSet: (() => void) | undefined;
export let testOverrideGlobalContext:
  | ((context: Partial<GlobalContext> | null) => GlobalContext | null)
  | undefined;

if (DEBUG) {
  assertGlobalContextWasSet = () => {
    if (globalContextWasSet === false) {
      throw new Error(
        'The global context for Glimmer VM was not set. You must set these global context functions to let Glimmer VM know how to accomplish certain operations. You can do this by importing `setGlobalContext` from `@glimmer/global-context`'
      );
    }
  };

  testOverrideGlobalContext = (context: Partial<GlobalContext> | null) => {
    let originalGlobalContext = globalContextWasSet
      ? {
          scheduleRevalidate,
          scheduleDestroy,
          scheduleDestroyed,
          toIterator,
          toBool,
          getProp,
          setProp,
          getPath,
          setPath,
          warnIfStyleNotTrusted,
        }
      : null;

    if (context === null) {
      globalContextWasSet = false;
    } else {
      globalContextWasSet = true;
    }

    scheduleRevalidate = context?.scheduleRevalidate || scheduleRevalidate;
    scheduleDestroy = context?.scheduleDestroy || scheduleDestroy;
    scheduleDestroyed = context?.scheduleDestroyed || scheduleDestroyed;
    toIterator = context?.toIterator || toIterator;
    toBool = context?.toBool || toBool;
    getProp = context?.getProp || getProp;
    setProp = context?.setProp || setProp;
    getPath = context?.getPath || getPath;
    setPath = context?.setPath || setPath;
    warnIfStyleNotTrusted = context?.warnIfStyleNotTrusted || warnIfStyleNotTrusted;

    return originalGlobalContext;
  };
}
