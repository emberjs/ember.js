import { Descriptor as EmberDescriptor } from './properties';

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
    Object.defineProperty(obj, key, this.desc);
  }

  teardown(obj, key) {
  }
}
