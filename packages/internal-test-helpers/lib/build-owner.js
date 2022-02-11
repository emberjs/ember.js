import Application from '@ember/application';
import ApplicationInstance from '@ember/application/instance';
import Engine from '@ember/engine';
import { registerDestructor } from '@ember/destroyable';

class ResolverWrapper {
  constructor(resolver) {
    this.resolver = resolver;
  }

  create() {
    return this.resolver;
  }
}

export default function buildOwner(options = {}) {
  let ownerType = options.ownerType || 'application';
  let ownerOptions = options.ownerOptions || {};
  let resolver = options.resolver;
  let bootOptions = options.bootOptions || {};

  let namespace;
  if (ownerType === 'application') {
    namespace = Application.create({
      autoboot: false,
      Resolver: new ResolverWrapper(resolver),
    });
  } else {
    namespace = Engine.create({
      buildRegistry() {
        return (this.__registry__ = Application.buildRegistry(this));
      },
      Resolver: new ResolverWrapper(resolver),
    });
  }

  let owner = namespace.buildInstance(ownerOptions);

  ApplicationInstance.setupRegistry(owner.__registry__, bootOptions);

  registerDestructor(owner, () => namespace.destroy());

  return owner;
}
