import { Blueprint, Descriptor } from './mixin';
import { ClassMeta } from './object';
import { InternedString, intern } from 'htmlbars-util';

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