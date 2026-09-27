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
}
