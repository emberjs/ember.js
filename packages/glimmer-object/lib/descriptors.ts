import { Blueprint, Descriptor } from './mixin';
import { ClassMeta } from './object';
import { ComputedBlueprint } from './computed';
import { InternedString, intern } from 'glimmer-util';

class AliasMethodDescriptor extends Descriptor {
  private name: InternedString;

  constructor(name: InternedString) {
    super();
    this.name = name;
  }

  define(target: Object, key: InternedString, home: Object) {
    let name = <string>this.name;

    Object.defineProperty(target, key, {
      enumerable: true,
      configurable: true,
      get() {
        return this[name];
      }
    });
  }
}

class AliasMethodBlueprint extends Blueprint {
  private name: InternedString;

  constructor(name: InternedString) {
    super();
    this.name = name;
  }

  descriptor(target: Object, key: InternedString, meta: ClassMeta): Descriptor {
    return new AliasMethodDescriptor(this.name);
  }
}

export function aliasMethod(name: string) {
  return new AliasMethodBlueprint(intern(name));
}

class AliasBlueprint extends ComputedBlueprint {
  private name: InternedString[];

  constructor(name: InternedString[]) {
    let parent = name.slice(0, -1);
    let last = name[name.length - 1];

    let get = function() {
      return name.reduce((obj, n) => obj[<string>n], this);
    };

    let set = function(value) {
      let p = parent.reduce((obj, n) => obj[<string>n], this);
      p[<string>last] = value;
    };

    super({ get, set }, [name]);
    this.name = name;
  }

  descriptor(target: Object, key: InternedString, meta: ClassMeta): Descriptor {
    if (this.name[0] === key) throw new Error(`Setting alias '${key}' on self`);
    return super.descriptor(target, key, meta);
  }
}

export function alias(name: string): AliasBlueprint {
  return new AliasBlueprint(name.split('.').map(intern));
}
