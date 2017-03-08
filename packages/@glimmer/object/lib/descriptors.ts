import { Blueprint, Descriptor } from './mixin';
import { ClassMeta } from './object';
import { ComputedBlueprint } from './computed';

class AliasMethodDescriptor extends Descriptor {
  private name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  define(target: Object, key: string, _home: Object) {
    let name = <string>this.name;

    Object.defineProperty(target, key, {
      enumerable: true,
      configurable: true,
      get(this: typeof target) {
        return this[name];
      }
    });
  }
}

class AliasMethodBlueprint extends Blueprint {
  private name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  descriptor(_target: Object, _key: string, _meta: ClassMeta): Descriptor {
    return new AliasMethodDescriptor(this.name);
  }
}

export function aliasMethod(name: string): Blueprint {
  return new AliasMethodBlueprint(name);
}

class AliasBlueprint extends ComputedBlueprint {
  private name: string[];

  constructor(name: string[]) {
    let parent = name.slice(0, -1);
    let last = name[name.length - 1];

    let get = function(this: any) {
      return name.reduce((obj, n) => obj[n], this);
    };

    let set = function(this: any, value: any) {
      let p = parent.reduce((obj, n) => obj[n], this);
      p[last] = value;
    };

    super({ get, set }, [name]);
    this.name = name;
  }

  descriptor(target: Object, key: string, meta: ClassMeta): Descriptor {
    if (this.name[0] === key) throw new Error(`Setting alias '${key}' on self`);
    return super.descriptor(target, key, meta);
  }
}

export function alias(name: string): Blueprint {
  return new AliasBlueprint(name.split('.'));
}
