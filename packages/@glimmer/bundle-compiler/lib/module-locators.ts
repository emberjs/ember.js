export type ModuleName = string;
export type NamedExport = string;

/**
 * ModuleLocators are a data structure that represents a single export for a
 * given module. For example, given the file `person.js`:
 *
 *    export default class Person { constructor(firstName, lastName) {
 *      this.firstName = firstName; this.lastName = lastName;
 *      }
 *    }
 *
 *    export const DEFAULT_PERSON = new Person('Yehuda', 'Katz');
 *
 * This file would be described by two module locators:
 *
 *  // describes the Person class default export
 *  { module: 'person.js', name:  'default' }
 *  // describes the named export of the Yehuda Katz instance
 *  { module: 'person.js', name: 'DEFAULT_PERSON' }
 *
 * Module locators allow the Glimmer compiler and the host environment to refer
 * to module exports symbolically at compile time. During compilation, each
 * module export is assigned a unique handle. At runtime, the host environment
 * is responsible for providing the actual module export value for a given
 * handle.
 */
export interface ModuleLocator {
  module: ModuleName;
  name: NamedExport;
}

/**
 * An AnnotatedModuleLocator is a ModuleLocator augmented with additional
 * metadata about that module that is made available to the compiler.
 */
export interface AnnotatedModuleLocator extends ModuleLocator {
  kind: string;
  meta: {};
}

/**
 * A TemplateLocator is a ModuleLocator annotated with additional information
 * about a template.
 */
export interface TemplateLocator<Meta> extends AnnotatedModuleLocator {
  kind: 'template';
  meta: Meta;
}

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
export class ModuleLocatorMap<V, K extends ModuleLocator = ModuleLocator> {
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
