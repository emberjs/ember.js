import AbstractApplicationTestCase from './abstract-application';
import type Resolver from '../test-resolver';
import { ModuleBasedResolver } from '../test-resolver';
import type { InternalFactory } from '@ember/-internals/owner';

export default abstract class TestResolverApplicationTestCase extends AbstractApplicationTestCase {
  abstract resolver?: Resolver;

  get applicationOptions() {
    return Object.assign(super.applicationOptions, {
      Resolver: ModuleBasedResolver,
    });
  }

  add(specifier: string, factory: InternalFactory<object> | object) {
    this.resolver!.add(specifier, factory);
  }

  /**
    Replaces a registration with a subclass of it.

    The registry caches a class after the first lookup, so the old
    registration must go before the resolver can supply the subclass.
  */
  subclass<T extends object>(specifier: `${string}:${string}`, build: (Base: T) => T) {
    let Base = this.application.resolveRegistration(specifier) as T;

    this.application.unregister(specifier);
    this.add(specifier, build(Base));
  }
}
