import { ModuleLocator, ModuleLocatorMap } from './module-locators';

/**
 * Maps ModuleLocators to their associated handles, and vice versa. The table
 * tracks both application handles (used to map symbolic references at compile
 * time into concrete objects at runtime) and VM handles (used to track the
 * offset of a compiled template in the binary program).
 *
 * Host environments can use this module table, provided at the end of
 * compilation, to codegen a similar data structure in the compiled JavaScript
 * output that allows the resolver to exchange handles for concrete module
 * values at runtime.
 */
export default class ExternalModuleTable {
  public byModuleLocator = new ModuleLocatorMap<number>();
  public byHandle = new Map<number, ModuleLocator>();

  public vmHandleByModuleLocator = new ModuleLocatorMap<number>();
  public byVMHandle = new Map<number, ModuleLocator>();

  /**
   * Returns the handle (unique integer id) for the provided module locator. If
   * the locator has not been seen before, a new handle is assigned. Otherwise,
   * the same handle is always returned for a given locator.
   */
  public handleForModuleLocator(locator: ModuleLocator): number {
    let { byModuleLocator, byHandle } = this;

    let handle = byModuleLocator.get(locator);

    if (handle === undefined) {
      handle = byHandle.size;
      byHandle.set(handle, locator);
      byModuleLocator.set(locator, handle);
    }

    return handle;
  }
}
