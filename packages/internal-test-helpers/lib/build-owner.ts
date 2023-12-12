import Application from '@ember/application';
import ApplicationInstance from '@ember/application/instance';
import Engine from '@ember/engine';
import { registerDestructor } from '@ember/destroyable';
import type Resolver from './test-resolver';
import type { EngineInstanceOptions } from '@ember/engine/instance';

class ResolverWrapper {
  resolver: Resolver;

  constructor(resolver: Resolver) {
    this.resolver = resolver;
  }

  create(): Resolver {
    return this.resolver;
  }
}

export default function buildOwner(
  options: {
    ownerType?: 'application' | 'engine';
    ownerOptions?: EngineInstanceOptions;
    resolver?: Resolver;
    bootOptions?: object;
  } = {}
) {
  let ownerType = options.ownerType || 'application';
  let ownerOptions = options.ownerOptions || {};
  // TODO(SAFETY): this is a lie, and we should use the error thrown below.
  // At the moment, though, some *tests* pass no resolver, and expect this to
  // work anyway. The fix is to have those tests pass a test-friendly resolver
  // and then this will work as expected.
  let resolver = options.resolver!;
  // if (!resolver) {
  //   throw new Error('You must provide a resolver to buildOwner');
  // }
  let bootOptions = options.bootOptions || {};

  let namespace: Application | Engine;
  if (ownerType === 'application') {
    namespace = Application.create({
      autoboot: false,
      Resolver: new ResolverWrapper(resolver),
    });
  } else {
    namespace = Engine.create({
      buildRegistry(this: Engine) {
        // SAFETY: This cast isn't that safe, but it should be ok for tests.
        return (this.__registry__ = Application.buildRegistry(this as unknown as Application));
      },
      Resolver: new ResolverWrapper(resolver),
    });
  }

  let owner = namespace.buildInstance(ownerOptions);

  ApplicationInstance.setupRegistry(owner.__registry__, bootOptions);

  registerDestructor(owner, () => namespace.destroy());

  return owner;
}
