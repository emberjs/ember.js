import type { ResolverClass } from '@ember/-internals/container/lib/registry';
import type { default as Owner, RegisterOptions, Factory } from '@ember/owner';
import type Namespace from '@ember/application/namespace';
import type { Initializer } from '@ember/engine';
import Engine from '@ember/engine';
import type EngineInstance from '@ember/engine/instance';
import EmberObject from '@ember/object';
import { expectTypeOf } from 'expect-type';

declare let owner: Owner;

class Foo extends EmberObject {}
class Bar {}

let engine = new Engine(owner);

expectTypeOf(engine).toMatchTypeOf<Namespace>();

expectTypeOf(engine.buildInstance()).toEqualTypeOf<EngineInstance>();
engine.buildInstance({ mountPoint: 'foo', routable: true });
engine.buildInstance({});
engine.buildInstance({ mountPoint: 'foo' });

// @ts-expect-error Invalid argument
engine.buildInstance(1);
// @ts-expect-error Invalid argument
engine.buildInstance({ mountPoint: 1, routable: true });

expectTypeOf(engine.initializer).toEqualTypeOf<(initializer: Initializer<Engine>) => void>();

expectTypeOf(engine.instanceInitializer).toEqualTypeOf<
  (initializer: Initializer<EngineInstance>) => void
>();

expectTypeOf(engine.Resolver).toEqualTypeOf<ResolverClass>();

// RegistryProxy

expectTypeOf(engine.resolveRegistration('foo:bar')).toEqualTypeOf<
  Factory<object> | object | undefined
>();
// @ts-expect-error Requires name
engine.resolveRegistration();
// @ts-expect-error Only takes one arg
engine.resolveRegistration('foo', {});

expectTypeOf(engine.register('fruit:favorite', Foo)).toMatchTypeOf<void>();
engine.register('fruit:favorite', Foo, { singleton: true, instantiate: true });
engine.register('fruit:foo', Bar);
// @ts-expect-error requires a string name
engine.register(1, Foo);
// @ts-expect-error requires a Factory
engine.register('fruit:foo');
// @ts-expect-error requires valid options
engine.register('fruit:favorite', Foo, { singleton: 1 });

expectTypeOf(engine.unregister('model:user')).toEqualTypeOf<void>();
// @ts-expect-error Requires a name
engine.unregister();

expectTypeOf(engine.hasRegistration('fruit:favorite')).toEqualTypeOf<boolean>();
// @ts-expect-error Requires a name
engine.hasRegistration();

expectTypeOf(engine.registeredOption('fruit:favorite', 'instantiate')).toEqualTypeOf<
  boolean | undefined
>();
engine.registeredOption('fruit:favorite', 'singleton');
// @ts-expect-error verifies key
engine.registeredOption('fruit:favorite', 'invalid');

expectTypeOf(engine.registerOptions('fruit:favorite', { instantiate: true })).toEqualTypeOf<void>();
// @ts-expect-error requires options
engine.registerOptions('fruit:favorite');
// @ts-expect-error requires valid options
engine.registerOptions('fruit:favorite', 1);
// @ts-expect-error requires valid options
engine.registerOptions('fruit:favorite', { singleton: 1 });

expectTypeOf(engine.registeredOptions('fruit:favorite')).toEqualTypeOf<
  RegisterOptions | undefined
>();
// @ts-expect-error requires string name
engine.registeredOption(1);

expectTypeOf(
  engine.registerOptionsForType('fruit:favorite', { singleton: true, instantiate: false })
).toEqualTypeOf<void>();
// @ts-expect-error requires options
engine.registerOptionsForType('fruit:favorite');
// @ts-expect-error requires valid options
engine.registerOptionsForType('fruit:favorite', 1);
// @ts-expect-error requires valid options
engine.registerOptionsForType('fruit:favorite', { singleton: 1 });

expectTypeOf(engine.registeredOptionsForType('my-type')).toEqualTypeOf<
  RegisterOptions | undefined
>();
// @ts-expect-error requires type
engine.registeredOptionsForType();
