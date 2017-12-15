import { meta } from './meta';
import { Descriptor as EmberDescriptor, defineProperty } from './properties';

export default function descriptor(desc) {
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
  constructor(desc) {
    super();
    this.desc = desc;
  }

  setup(obj, key) {
    defineProperty(obj, key, this.desc);
    // meta(obj).removeDescriptors(key);
    // Object.defineProperty(obj, key, this.desc);
  }

  get(obj, key) {
    return obj[key];
  }

  set(obj, key, value) {
    return obj[key] = value;
  }

  teardown(obj, key) {
  }
}
