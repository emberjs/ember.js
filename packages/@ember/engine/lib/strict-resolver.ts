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
    return this.#plurals.get(s) ?? s + 's';
  }

  resolve(fullName: string): Factory<object> | object | undefined {
    let [type, name] = fullName.split(':') as [string, string];
    name = this.#normalizeName(type, name);
    for (let strategy of [this.#resolveSelf, this.#mainLookup, this.#defaultLookup]) {
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
}

const fileExtension = /\.\w{1,4}$/;
const leadingDotSlash = /^\.\//;

type Result =
  | {
      hit: any;
    }
  | undefined;
