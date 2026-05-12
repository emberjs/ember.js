import type { Factory, Resolver } from '@ember/owner';

export class StrictResolver implements Resolver {
  // Ember's router uses this flag to decide whether to auto-generate
  // `${name}_loading` and `${name}_error` substates for routes defined in
  // `Router.map(...)`. Since we always resolve against an ES module registry,
  // we unconditionally opt in.
  moduleBasedResolver = true;

  #modules = new Map<string, unknown>();
  #plurals = new Map<string, string>([
    ['component', 'components'],
    ['config', 'config'],
    ['controller', 'controllers'],
    ['helper', 'helpers'],
    ['model', 'models'],
    ['modifier', 'modifiers'],
    ['route', 'routes'],
    ['template', 'templates'],
  ]);
  original: any;

  constructor(modules: Record<string, unknown>) {
    this.addModules(modules);
  }

  addModules(modules: Record<string, unknown>) {
    for (let [moduleName, module] of Object.entries(modules)) {
      this.#modules.set(this.#normalizeModule(moduleName), module);
    }
  }

  #normalizeModule(moduleName: string) {
    return moduleName.replace(fileExtension, '').replace(leadingDotSlash, '');
  }

  /**
   * We only support plurals for the well known things (for historical reasons)
   * (see the hard-coded map of plurals in #plurals)
   */
  #plural(s: string) {
    return this.#plurals.get(s) ?? s;
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
  // sibling `index.hbs` inside the same folder.
  #nestedColocationLookup(type: string, name: string): Result {
    if (type !== 'component') return undefined;

    let dir = this.#plural(type);
    let target = `${dir}/${name}/index`;
    let module = this.#modules.get(target);
    if (module) {
      return { hit: module };
    }
    return undefined;
  }
}

const fileExtension = /\.\w{1,4}$/;
const leadingDotSlash = /^\.\//;
const camelCaseBoundary = /([a-z\d])([A-Z])/g;
const spacesAndUnderscores = /[ _]/g;

function dasherize(str: string): string {
  return str.replace(camelCaseBoundary, '$1_$2').toLowerCase().replace(spacesAndUnderscores, '-');
}

type Result =
  | {
      hit: any;
    }
  | undefined;
