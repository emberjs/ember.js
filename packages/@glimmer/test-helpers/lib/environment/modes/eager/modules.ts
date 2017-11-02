import { Opaque, Option, dict, Dict, assert } from '@glimmer/util';
import { TemplateLocator } from '@glimmer/bundle-compiler';

export type ModuleType = 'component' | 'helper' | 'modifier' | 'partial' | 'other';

export class Module {
  constructor(private dict: Dict<Opaque>, public type: ModuleType) {
    Object.freeze(this.dict);
  }

  has(key: string) {
    return key in this.dict;
  }

  get(key: string): Opaque {
    return this.dict[key];
  }
}

export class Modules {
  private registry = dict<Module>();

  has(name: string): boolean {
    return name in this.registry;
  }

  get(name: string): Module {
    return this.registry[name];
  }

  type(name: string): ModuleType {
    let module = this.registry[name];
    return module.type;
  }

  register(name: string, type: ModuleType, value: Dict<Opaque>) {
    assert(name.indexOf('ui/components/ui') === -1, `BUG: ui/components/ui shouldn't be a prefix`);
    assert(!name.match(/^[A-Z]/), 'BUG: Components should be nested under ui/components');
    this.registry[name] = new Module(value, type);
  }

  resolve(name: string, referrer: TemplateLocator, defaultRoot?: string): Option<string> {
    let local = referrer.module && referrer.module.replace(/^((.*)\/)?([^\/]*)$/, `$1${name}`);
    if (local && this.registry[local]) {
      return local;
    } else if (defaultRoot && this.registry[`${defaultRoot}/${name}`]) {
      return `${defaultRoot}/${name}`;
    } else if (this.registry[name]) {
      return name;
    } else {
      return null;
    }
  }
}
