import { HelperFactory, HelperFunction, SimpleHelper } from '@ember/-internals/glimmer/lib/helper';
import { getDebugName } from '@ember/-internals/utils';
import { capabilities, setHelperManager } from '@ember/helper';
import { Arguments, HelperManager } from '@glimmer/interfaces';
import { expectTypeOf } from 'expect-type';

class Wrapper implements HelperFactory<SimpleHelper> {
  isHelperFactory: true = true;

  constructor(public compute: HelperFunction) {}

  create() {
    // needs new instance or will leak containers
    return {
      compute: this.compute,
    };
  }
}

class SimpleClassicHelperManager implements HelperManager<() => unknown> {
  capabilities = capabilities('3.23', {
    hasValue: true,
  });

  createHelper(definition: Wrapper, args: Arguments) {
    let { compute } = definition;

    return () => compute.call(null, args.positional as unknown[], args.named);
  }

  getValue(fn: () => unknown) {
    return fn();
  }

  getDebugName(definition: Wrapper) {
    return getDebugName!(definition.compute);
  }
}

export const SIMPLE_CLASSIC_HELPER_MANAGER = new SimpleClassicHelperManager();

expectTypeOf(
  setHelperManager(() => SIMPLE_CLASSIC_HELPER_MANAGER, Wrapper.prototype)
).toEqualTypeOf<Wrapper>();

// @ts-expect-error invalid factory
setHelperManager(1, Wrapper.prototype);

// @ts-expect-error requires a second param
setHelperManager(() => SIMPLE_CLASSIC_HELPER_MANAGER);
