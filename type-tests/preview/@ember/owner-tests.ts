import Owner, {
  Factory,
  FactoryManager,
  FullName,
  RegisterOptions,
  Resolver,
  KnownForTypeResult,
} from '@ember/owner';
import { expectTypeOf } from 'expect-type';

// Just a class we can construct in the Factory and FactoryManager tests
declare class ConstructThis {
  hasProps: boolean;
}

// ----- RegisterOptions ----- //
declare let regOptionsA: RegisterOptions;
expectTypeOf(regOptionsA.instantiate).toEqualTypeOf<boolean | undefined>();
expectTypeOf(regOptionsA.singleton).toEqualTypeOf<boolean | undefined>();

// ----- Factory ----- //
// This gives us coverage for the cases where you are *casting*.
declare let aFactory: Factory<ConstructThis>;

aFactory.create();
aFactory.create({});
aFactory.create({
  hasProps: true,
});
aFactory.create({
  hasProps: false,
});

// These should be rejected by way of EPC
// @ts-expect-error
aFactory.create({ unrelatedNonsense: 'yep yep yep' });
// @ts-expect-error
aFactory.create({ hasProps: true, unrelatedNonsense: 'yep yep yep' });

// But this should be legal.
const goodPojo = { hasProps: true, unrelatedNonsense: 'also true' };
aFactory.create(goodPojo);

// while this should be rejected for *type error* reasons, not EPC
const badPojo = { hasProps: 'huzzah', unrelatedNonsense: 'also true' };
// @ts-expect-error
aFactory.create(badPojo);

// ----- FactoryManager ----- //
declare let aFactoryManager: FactoryManager<ConstructThis>;
expectTypeOf(aFactoryManager.class).toEqualTypeOf<Factory<ConstructThis>>();
expectTypeOf(aFactoryManager.create({})).toEqualTypeOf<ConstructThis>();
expectTypeOf(aFactoryManager.create({ hasProps: true })).toEqualTypeOf<ConstructThis>();
expectTypeOf(aFactoryManager.create({ hasProps: false })).toEqualTypeOf<ConstructThis>();
// @ts-expect-error
aFactoryManager.create({ otherStuff: 'nope' });
// @ts-expect-error
aFactoryManager.create({ hasProps: true, otherStuff: 'nope' });
expectTypeOf(aFactoryManager.create(goodPojo)).toEqualTypeOf<ConstructThis>();
// @ts-expect-error
aFactoryManager.create(badPojo);

// ----- Resolver ----- //
declare let resolver: Resolver;
expectTypeOf<Resolver['normalize']>().toEqualTypeOf<((fullName: FullName) => string) | undefined>();
expectTypeOf<Resolver['lookupDescription']>().toEqualTypeOf<
  ((fullName: FullName) => string) | undefined
>();
expectTypeOf(resolver.resolve('some-name')).toEqualTypeOf<object | Factory<object> | undefined>();
const knownForFoo = resolver.knownForType?.('foo');
expectTypeOf(knownForFoo).toEqualTypeOf<KnownForTypeResult<'foo'> | undefined>();
expectTypeOf(knownForFoo?.['foo:bar']).toEqualTypeOf<boolean | undefined>();
// @ts-expect-error
knownForFoo?.['blah'];

// This one is last so it can reuse the bits from above!
// ----- Owner ----- //
declare let owner: Owner;

// @ts-expect-error
owner.lookup();
expectTypeOf(owner.lookup('type:name')).toEqualTypeOf<unknown>();
// @ts-expect-error
owner.lookup('non-namespace-string');
expectTypeOf(owner.lookup('namespace@type:name')).toEqualTypeOf<unknown>();

expectTypeOf(owner.register('type:name', aFactory)).toEqualTypeOf<void>();
expectTypeOf(owner.register('type:name', aFactory, {})).toEqualTypeOf<void>();
expectTypeOf(owner.register('type:name', aFactory, { instantiate: true })).toEqualTypeOf<void>();
expectTypeOf(owner.register('type:name', aFactory, { instantiate: false })).toEqualTypeOf<void>();
expectTypeOf(owner.register('type:name', aFactory, { singleton: true })).toEqualTypeOf<void>();
expectTypeOf(owner.register('type:name', aFactory, { singleton: false })).toEqualTypeOf<void>();
expectTypeOf(
  owner.register('type:name', aFactory, { instantiate: true, singleton: true })
).toEqualTypeOf<void>();
expectTypeOf(
  owner.register('type:name', aFactory, { instantiate: true, singleton: false })
).toEqualTypeOf<void>();
expectTypeOf(
  owner.register('type:name', aFactory, { instantiate: false, singleton: true })
).toEqualTypeOf<void>();
expectTypeOf(
  owner.register('type:name', aFactory, { instantiate: false, singleton: false })
).toEqualTypeOf<void>();
// @ts-expect-error
owner.register('non-namespace-string', aFactory);
expectTypeOf(owner.register('namespace@type:name', aFactory)).toEqualTypeOf<void>();

expectTypeOf(owner.factoryFor('type:name')).toEqualTypeOf<FactoryManager<unknown> | undefined>();
expectTypeOf(owner.factoryFor('type:name')?.class).toEqualTypeOf<Factory<unknown> | undefined>();
expectTypeOf(owner.factoryFor('type:name')?.create()).toEqualTypeOf<unknown>();
expectTypeOf(owner.factoryFor('type:name')?.create({})).toEqualTypeOf<unknown>();
expectTypeOf(
  owner.factoryFor('type:name')?.create({ anythingGoes: true })
).toEqualTypeOf<unknown>();
// @ts-expect-error
owner.factoryFor('non-namespace-string');
expectTypeOf(owner.factoryFor('namespace@type:name')).toEqualTypeOf<
  FactoryManager<unknown> | undefined
>();

// Tests deal with the fact that string literals are a special case! `let`
// bindings will accordingly not "just work" as a result. The separate
// assignments both satisfy the linter and show why it matters.
let aName;
aName = 'type:name';
// @ts-expect-error
owner.lookup(aName);

let aTypedName: FullName;
aTypedName = 'type:name';
expectTypeOf(owner.lookup(aTypedName)).toBeUnknown();

// Nor will callbacks work "out of the box". But they can work if they have the
// correct type.
declare const justStrings: string[];
// @ts-expect-error
justStrings.map((aString) => owner.lookup(aString));
declare let typedStrings: FullName[];
typedStrings.map((aString) => owner.lookup(aString));

// Also make sure it keeps working with const bindings
const aConstName = 'type:name';
expectTypeOf(owner.lookup(aConstName)).toBeUnknown();

// ----- Minimal further coverage for POJOs ----- //
// `Factory` and `FactoryManager` don't have to deal in actual classes. :sigh:
const Creatable = {
  hasProps: true,
};

const pojoFactory: Factory<typeof Creatable> = {
  create(initialValues?) {
    const instance = Creatable;
    if (initialValues) {
      if (initialValues.hasProps) {
        Object.defineProperty(instance, 'hasProps', {
          value: initialValues.hasProps,
          enumerable: true,
          writable: true,
        });
      }
    }
    return instance;
  },
};

expectTypeOf(pojoFactory.create()).toEqualTypeOf<{ hasProps: boolean }>();
