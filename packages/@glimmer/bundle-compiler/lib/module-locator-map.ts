import { ModuleLocator } from '@glimmer/interfaces';

type ByModule<V> = Map<string, ByName<V>>;
type ByName<V> = Map<string, V>;

/**
 * The ModuleLocatorMap is a map-like data structure that accepts a
 * ModuleLocator as the key. Instead of relying on a locator's identity to
 * determine uniqueness, it instead indexes values based on the locator's
 * `module` and `name` properties.
 *
 * This means you can use different object literals as locators to get and set
 * values from the map, even if though they do not share identity:
 *
 * ```ts
 * let map = new ModuleLocatorMap<number>;
 * map.set({ module: 'foo', name: 'default' }, 123);
 * map.get({ module: 'foo', name: 'default' }); // returns 123
 * ```
 */
export default class ModuleLocatorMap<V, K extends ModuleLocator = ModuleLocator> {
  private byModule: ByModule<V> = new Map();
  private locators = new Set<K>();

  set(locator: K, value: V): this {
    let { module, name } = locator;
    this._byName(module).set(name, value);
    this.locators.add(locator);
    return this;
  }

  get({ module, name }: K): V | undefined {
    return this._byName(module).get(name);
  }

  forEach(cb: (value: V, key: K) => void): void {
    this.locators.forEach(locator => {
      cb(this.get(locator)!, locator);
    });
  }

  private _byName(module: string): ByName<V> {
    let byName = this.byModule.get(module);

    if (!byName) {
      byName = new Map();
      this.byModule.set(module, byName);
    }

    return byName;
  }
}
