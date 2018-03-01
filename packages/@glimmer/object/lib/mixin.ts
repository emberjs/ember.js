import { CLASS_META } from '@glimmer/object-reference';
import { Dict, dict, assign } from '@glimmer/util';
import GlimmerObject, {
  GlimmerObjectFactory,
  ClassMeta,
  InstanceMeta,
  turbocharge
} from './object';

import { ROOT } from './utils';

const { isArray } = Array;

export const DESCRIPTOR = "5d90f84f-908e-4a42-9749-3d0f523c262c";
export const BLUEPRINT  = "8d97cf5f-db9e-48d8-a6b2-7a75b7170805";

export abstract class Descriptor {
  "5d90f84f-908e-4a42-9749-3d0f523c262c" = true;
  abstract define(prototype: Object, key: string, home: Object): void;
}

export abstract class Blueprint {
  "8d97cf5f-db9e-48d8-a6b2-7a75b7170805" = true;
  abstract descriptor(target: Object, key: string, classMeta: ClassMeta): Descriptor;
}

export interface Extensions {
  concatenatedProperties?: string[] | string | null;
  mergedProperties?: string[] | string;
  _super?: Function;
  [index: string]: any;
}

export class Mixin {
  private extensions: Dict<any> = null as any; // assigned before used
  private concatenatedProperties: string[] = [];
  private mergedProperties: string[] = [];
  private dependencies: Mixin[] = [];

  static create(...args: (Mixin | Extensions)[]) {
    let extensions = args[args.length - 1];

    if (args.length === 0) {
      return new this({}, []);
    } else if (extensions instanceof Mixin) {
      return new this({}, args as Mixin[]);
    } else {
      let deps = args.slice(0, -1).map(toMixin);
      return new this(extensions as Extensions, deps);
    }
  }

  static mixins(obj: any): Mixin[] {
    if (typeof obj !== 'object' || obj === null) return [];

    let meta = ClassMeta.for(obj);
    if (!meta) return [];

    return meta.getAppliedMixins();
  }

  constructor(extensions: Extensions, mixins: Mixin[]) {
    this.reopen(extensions);
    this.dependencies.push(...mixins);
  }

  detect(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null) return false;

    if (obj instanceof Mixin) {
      return obj.dependencies.indexOf(this) !== -1;
    }

    let meta = ClassMeta.for(obj);
    return !!meta && meta.hasAppliedMixin(this);
  }

  reopen(extensions: Extensions) {
    if (this.extensions) {
      this.dependencies.push(toMixin(this.extensions));
    }

    if (typeof extensions === 'object' && 'concatenatedProperties' in extensions) {
      let concat: string[];
      let rawConcat = extensions.concatenatedProperties;

      if (isArray(rawConcat)) {
        concat = (rawConcat as string[]).slice();
      } else if (rawConcat === null || rawConcat === undefined) {
        concat = [];
      } else {
        concat = [rawConcat as string];
      }

      delete extensions.concatenatedProperties;
      this.concatenatedProperties = concat;
    }

    if (typeof extensions === 'object' && 'mergedProperties' in extensions) {
      let merged: string[];
      let rawMerged = extensions.mergedProperties;

      if (isArray(rawMerged)) {
        merged = (rawMerged as string[]).slice();
      } else if (rawMerged === null || rawMerged === undefined) {
        merged = [];
      } else {
        merged = [rawMerged as string];
      }

      delete extensions.mergedProperties;
      this.mergedProperties = merged;
    }

    let normalized: Dict<Blueprint> = Object.keys(extensions).reduce((obj, key) => {
      let value = extensions[key];

      switch (typeof value) {
        case 'function':
          obj[key] = new MethodBlueprint({ value });
          break;
        case 'object':
          if (value && BLUEPRINT in value) {
            obj[key] = value;
            break;
          }
          /* falls through */
        default:
          obj[key] = new DataBlueprint({ value });
      }

      return obj;
    }, dict<Blueprint>());

    this.extensions = dict<any>();
    assign(this.extensions, turbocharge(normalized));
  }

  apply(target: any) {
    let meta: ClassMeta = target[CLASS_META] = target[CLASS_META] || new ClassMeta();
    this.dependencies.forEach(m => m.apply(target));
    this.mergeProperties(target, target, meta);
    meta.addMixin(this);
    meta.seal();
    meta.reseal(target);

    return target;
  }

  extendPrototype(Original: GlimmerObjectFactory<any>) {
    Original.prototype = Object.create(Original.prototype);
    this.dependencies.forEach(m => m.extendPrototype(Original));
    this.extendPrototypeOnto(Original, Original);
  }

  extendPrototypeOnto(Subclass: GlimmerObjectFactory<any>, Parent: GlimmerObjectFactory<any>) {
    this.dependencies.forEach(m => m.extendPrototypeOnto(Subclass, Parent));
    this.mergeProperties(Subclass.prototype, Parent.prototype, Subclass[CLASS_META]);
    Subclass[CLASS_META].addMixin(this);
  }

  extendStatic(Target: GlimmerObjectFactory<any>) {
    this.dependencies.forEach(m => m.extendStatic(Target));
    this.mergeProperties(Target, Object.getPrototypeOf(Target), Target[CLASS_META][CLASS_META]);
    Target[CLASS_META].addStaticMixin(this);
  }

  mergeProperties(target: Object, parent: Object, meta: ClassMeta) {
    if (meta.hasAppliedMixin(this)) return;
    meta.addAppliedMixin(this);

    this.mergedProperties.forEach(k => meta.addMergedProperty(k, parent[k]));
    this.concatenatedProperties.forEach(k => meta.addConcatenatedProperty(k, []));

    new ValueDescriptor({ value: meta.getConcatenatedProperties() }).define(target, 'concatenatedProperties');
    new ValueDescriptor({ value: meta.getMergedProperties() }).define(target, 'mergedProperties');

    Object.keys(this.extensions).forEach(key => {
      let extension: Blueprint = this.extensions![key];
      let desc = extension.descriptor(target, key as string, meta);
      desc.define(target, key as string, parent);
    });

    new ValueDescriptor({ value: ROOT }).define(target, '_super' as string);
  }
}

export type Extension = Mixin | Extensions;

export function extend<T extends GlimmerObject>(Parent: GlimmerObjectFactory<T>, ...extensions: Extension[]): GlimmerObjectFactory<any> {
  let Super = Parent as typeof GlimmerObject;

  let Subclass = class extends Super {};
  Subclass[CLASS_META] = InstanceMeta.fromParent(Parent[CLASS_META]);

  let mixins = extensions.map(toMixin);
  Parent[CLASS_META].addSubclass(Subclass as GlimmerObjectFactory<any>);
  mixins.forEach(m => Subclass[CLASS_META].addMixin(m));

  ClassMeta.applyAllMixins(Subclass as GlimmerObjectFactory<any>, Parent);

  return Subclass as any;
}

export function relinkSubclasses(Parent: GlimmerObjectFactory<any>) {
  Parent[CLASS_META].getSubclasses().forEach((Subclass: GlimmerObjectFactory<any>) => {
    Subclass[CLASS_META].reset(Parent[CLASS_META]);
    Subclass.prototype = Object.create(Parent.prototype);

    ClassMeta.applyAllMixins(Subclass, Parent);

    // recurse into sub-subclasses
    relinkSubclasses(Subclass);
  });
}

export function toMixin(extension: Extension): Mixin {
  if (extension instanceof Mixin) return extension;
  else return new Mixin(extension as Object, []);
}

class ValueDescriptor extends Descriptor {
  public enumerable: boolean;
  public configurable: boolean;
  public writable: boolean;
  public value: any;

  constructor({ enumerable=true, configurable=true, writable=true, value }: PropertyDescriptor) {
    super();
    this.enumerable = enumerable;
    this.configurable = configurable;
    this.writable = writable;
    this.value = value;
  }

  define(target: Object, key: string, _home?: any) {
    Object.defineProperty(target, key, {
      enumerable: this.enumerable,
      configurable: this.configurable,
      writable: this.writable,
      value: this.value
    });
  }
}

export class DataBlueprint extends Blueprint {
  public enumerable: boolean;
  public configurable: boolean;
  public value: any;
  public writable: boolean;

  constructor({ enumerable=true, configurable=true, writable=true, value }: PropertyDescriptor) {
    super();
    this.enumerable = enumerable;
    this.configurable = configurable;
    this.value = value;
    this.writable = writable;
  }

  descriptor(_target: Object, key: string, classMeta: ClassMeta): Descriptor {
    let { enumerable, configurable, writable, value } = this;

    if (classMeta.hasConcatenatedProperty(key as string)) {
      classMeta.addConcatenatedProperty(key as string, value);
      value = classMeta.getConcatenatedProperty(key as string);
    } else if (classMeta.hasMergedProperty(key as string)) {
      classMeta.addMergedProperty(key as string, value);
      value = classMeta.getMergedProperty(key as string);
    }

    return new ValueDescriptor({ enumerable, configurable, writable, value });
  }
}

export abstract class AccessorBlueprint extends Blueprint {
  public enumerable: boolean;
  public configurable: boolean;
  get: () => any;
  set: (value: any) => void;

  constructor({ enumerable=true, configurable=true, get, set }: PropertyDescriptor & { get: any, set: any }) {
    super();
    this.enumerable = enumerable;
    this.configurable = configurable;
    this.get = get;
    this.set = set;
  }

  descriptor(_target: Object, _key: string, _classMeta: ClassMeta): Descriptor {
    return new ValueDescriptor({
      enumerable: this.enumerable,
      configurable: this.configurable,
      get: this.get,
      set: this.set
    });
  }
}

class MethodDescriptor extends ValueDescriptor {
  define(target: Object, key: string, home: Object): void {
    this.value = wrapMethod(home, key, this.value);
    super.define(target, key, home);
  }
}

class MethodBlueprint extends DataBlueprint {
  descriptor(target: Object, key: string, classMeta: ClassMeta): MethodDescriptor {
    let desc = super.descriptor(target, key, classMeta);
    return new MethodDescriptor(desc as PropertyDescriptor);
  }
}

export function wrapMethod(home: Object, methodName: string, original: (...args: any[]) => any) {
  if (!(methodName as string in home)) return maybeWrap(original);

  let superMethod = home[methodName];

  let func = function(this: GlimmerObject, ...args: any[]) {
    if (!this) return original.apply(this, args);

    let lastSuper = this._super;
    this._super = superMethod;

    try {
      return original.apply(this, args);
    } finally {
      this._super = lastSuper;
    }
  };

  (func as any).__wrapped = true;

  return func;
}

function maybeWrap(original: Function) {
  if ('__wrapped' in original) return original;

  return function(this: GlimmerObject, ...args: any[]) {
    if (!this) return original.apply(this, args);

    let lastSuper = this._super;
    this._super = ROOT;

    try {
      return original.apply(this, args);
    } finally {
      this._super = lastSuper;
    }
  };
}
