import { DEBUG } from '@glimmer/env';

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

//////////

/**
 * Interfaces
 *
 * TODO: Move these into @glimmer/interfaces, move @glimmer/interfaces to
 * @glimmer/internal-interfaces.
 */
//////////
/**
 * Schedules a VM revalidation.
 *
 * Note: this has a default value so that tags can warm themselves when first loaded.
 */
let scheduleRevalidate = () => {};

/**
 * Schedules a destructor to run
 *
 * @param destroyable The destroyable being destroyed
 * @param destructor The destructor being scheduled
 */
let scheduleDestroy;

/**
 * Finalizes destruction
 *
 * @param finalizer finalizer function
 */
let scheduleDestroyed;

/**
 * Hook to provide iterators for `{{each}}` loops
 *
 * @param value The value to create an iterator for
 */
let toIterator;

/**
 * Hook to specify truthiness within Glimmer templates
 *
 * @param value The value to convert to a boolean
 */
let toBool;

/**
 * Hook for specifying how Glimmer should access properties in cases where it
 * needs to. For instance, accessing an object's values in templates.
 *
 * @param obj The object provided to get a value from
 * @param path The path to get the value from
 */
let getProp;

/**
 * Hook for specifying how Glimmer should update props in cases where it needs
 * to. For instance, when updating a template reference (e.g. 2-way-binding)
 *
 * @param obj The object provided to get a value from
 * @param prop The prop to set the value at
 * @param value The value to set the value to
 */
let setProp;

/**
 * Hook for specifying how Glimmer should access paths in cases where it needs
 * to. For instance, the `key` value of `{{each}}` loops.
 *
 * @param obj The object provided to get a value from
 * @param path The path to get the value from
 */
let getPath;

/**
 * Hook for specifying how Glimmer should update paths in cases where it needs
 * to. For instance, when updating a template reference (e.g. 2-way-binding)
 *
 * @param obj The object provided to get a value from
 * @param path The path to get the value from
 */
let setPath;

/**
 * Hook to warn if a style binding string or value was not marked as trusted
 * (e.g. HTMLSafe)
 */
let warnIfStyleNotTrusted;

/**
 * Hook to customize assertion messages in the VM. Usages can be stripped out
 * by using the @glimmer/vm-babel-plugins package.
 */
let assert;

/**
 * Hook to customize deprecation messages in the VM. Usages can be stripped out
 * by using the @glimmer/vm-babel-plugins package.
 */
let deprecate;

//////////

let globalContextWasSet = false;
function setGlobalContext(context) {
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
  assert = context.assert;
  deprecate = context.deprecate;
}
let assertGlobalContextWasSet;
let testOverrideGlobalContext;
if (DEBUG) {
  assertGlobalContextWasSet = () => {
    if (globalContextWasSet === false) {
      throw new Error('The global context for Glimmer VM was not set. You must set these global context functions to let Glimmer VM know how to accomplish certain operations. You can do this by importing `setGlobalContext` from `@glimmer/global-context`');
    }
  };
  testOverrideGlobalContext = context => {
    let originalGlobalContext = globalContextWasSet ? {
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
      assert,
      deprecate
    } : null;
    if (context === null) {
      globalContextWasSet = false;
    } else {
      globalContextWasSet = true;
    }

    // We use `undefined as any` here to unset the values when resetting the
    // context at the end of a test.
    scheduleRevalidate = context?.scheduleRevalidate || undefined;
    scheduleDestroy = context?.scheduleDestroy || undefined;
    scheduleDestroyed = context?.scheduleDestroyed || undefined;
    toIterator = context?.toIterator || undefined;
    toBool = context?.toBool || undefined;
    getProp = context?.getProp || undefined;
    setProp = context?.setProp || undefined;
    getPath = context?.getPath || undefined;
    setPath = context?.setPath || undefined;
    warnIfStyleNotTrusted = context?.warnIfStyleNotTrusted || undefined;
    assert = context?.assert || undefined;
    deprecate = context?.deprecate || undefined;
    return originalGlobalContext;
  };
}

export { assert, assertGlobalContextWasSet, setGlobalContext as default, deprecate, getPath, getProp, scheduleDestroy, scheduleDestroyed, scheduleRevalidate, setPath, setProp, testOverrideGlobalContext, toBool, toIterator, warnIfStyleNotTrusted };
