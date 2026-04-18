import type { Factory, Resolver } from '@ember/owner';
import { dasherize } from './strict-resolver/string';

export class StrictResolver implements Resolver {
  #modules = new Map<string, unknown>();
  #plurals = new Map<string, string>();
  original: any;

  constructor(
    modules: Record<string, unknown>,
    plurals: Record<string, string> | undefined = undefined
  ) {
    this.addModules(modules);
    this.#plurals.set('config', 'config');
    if (plurals) {
      for (let [singular, plural] of Object.entries(plurals)) {
        this.#plurals.set(singular, plural);
      }
    }
  }

  addModules(modules: Record<string, unknown>) {
    for (let [moduleName, module] of Object.entries(modules)) {
      this.#modules.set(this.#normalizeModule(moduleName), module);
    }
  }

  #normalizeModule(moduleName: string) {
    return moduleName.replace(fileExtension, '').replace(leadingDotSlash, '');
  }

  #plural(s: string) {
    return this.#plurals.get(s) ?? pluralize(s);
  }

  resolve(fullName: string): Factory<object> | object | undefined {
    let [type, name] = fullName.split(':') as [string, string];
    name = this.#normalizeName(type, name);
    for (let strategy of [
      this.#resolveSelf,
      this.#mainLookup,
      this.#defaultLookup,
      this.#nestedColocationLookup,
    ]) {
      let result = strategy.call(this, type, name);
      if (result) {
        return this.#extractDefaultExport(result.hit);
      }
    }
    return undefined;
  }

  #extractDefaultExport(module: any): Factory<object> | object | undefined {
    if (module && module['default']) {
      module = module['default'];
    }
    return module as Factory<object> | object | undefined;
  }

  normalize(fullName: `${string}:${string}`): `${string}:${string}` {
    let [type, name] = fullName.split(':') as [string, string];
    name = this.#normalizeName(type, name);
    return `${type}:${name}`;
  }

  #normalizeName(type: string, name: string): string {
    if (
      type === 'component' ||
      type === 'helper' ||
      type === 'modifier' ||
      (type === 'template' && name.indexOf('components/') === 0)
    ) {
      return name.replace(/_/g, '-');
    } else {
      return dasherize(name.replace(/\./g, '/'));
    }
  }

  #resolveSelf(type: string, name: string): Result {
    if (type === 'resolver' && name === 'current') {
      return {
        hit: {
          create: () => this,
        },
      };
    }
    return undefined;
  }

  #mainLookup(type: string, name: string): Result {
    if (name === 'main') {
      let module = this.#modules.get(type);
      if (module) {
        return { hit: module };
      }
    }
    return undefined;
  }

  #defaultLookup(type: string, name: string): Result {
    let dir = this.#plural(type);
    let target = `${dir}/${name}`;
    let module = this.#modules.get(target);
    if (module) {
      return { hit: module };
    }
    return undefined;
  }

  // Supports the nested colocation pattern where `component:my-widget`
  // resolves to `./components/my-widget/index.{js,ts,gjs,gts}`. The index
  // file is typically the component class, and it's commonly paired with a
  // sibling `template.hbs` inside the same folder.
  #nestedColocationLookup(type: string, name: string): Result {
    let dir = this.#plural(type);
    let target = `${dir}/${name}/index`;
    let module = this.#modules.get(target);
    if (module) {
      return { hit: module };
    }
    return undefined;
  }
}

// Handle the common irregular English plurals plus the standard -s / -es
// suffix rules. Users can override any type via the `plurals` constructor
// option (including overriding these defaults).
const IRREGULAR_PLURALS: Record<string, string> = Object.freeze({
  child: 'children',
  man: 'men',
  woman: 'women',
  person: 'people',
  mouse: 'mice',
  tooth: 'teeth',
  foot: 'feet',
});

const NEEDS_ES_SUFFIX = /(s|ss|sh|ch|x|z)$/;
const ENDS_IN_CONSONANT_Y = /([^aeiou])y$/;

function pluralize(singular: string): string {
  let irregular = IRREGULAR_PLURALS[singular];
  if (irregular) {
    return irregular;
  }
  if (ENDS_IN_CONSONANT_Y.test(singular)) {
    return singular.replace(ENDS_IN_CONSONANT_Y, '$1ies');
  }
  if (NEEDS_ES_SUFFIX.test(singular)) {
    return singular + 'es';
  }
  return singular + 's';
}

const fileExtension = /\.\w{1,4}$/;
const leadingDotSlash = /^\.\//;

type Result =
  | {
      hit: any;
    }
  | undefined;
