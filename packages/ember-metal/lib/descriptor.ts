import { Descriptor as EmberDescriptor } from './properties';

export default function descriptor(desc: PropertyDescriptor) {
  return new Descriptor(desc);
}

/**
  A wrapper for a native ES5 descriptor. In an ideal world, we wouldn't need
  this at all, however, the way we currently flatten/merge our mixins require
  a special value to denote a descriptor.

  @class Descriptor
  @private
*/
class Descriptor extends EmberDescriptor {
  desc: PropertyDescriptor;
  enumerable: boolean;
  configurable: boolean;

  constructor(desc: PropertyDescriptor) {
    super();
    this.desc = desc;
    this.enumerable = desc.enumerable !== false;
    this.configurable = desc.configurable !== false;
  }

  setup(obj: object, key: string) {
    Object.defineProperty(obj, key, this.desc);
  }

  get(obj: object, key: string): any | null | undefined {
    return obj[key];
  }

  set(obj: object, key: string, value: any | null | undefined) {
    return (obj[key] = value);
  }
}
