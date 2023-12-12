import Owner, {
  Factory,
  FactoryManager,
  FullName,
  RegisterOptions,
  Resolver,
  KnownForTypeResult,
  getOwner,
  setOwner,
} from '@ember/owner';
import Component from '@glimmer/component';
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

// NOTE: it would be nice if these could be rejected by way of EPC, but alas: it
// cannot, because the public contract for `create` allows implementors to
// define their `create` config object basically however they like. :-/
aFactory.create({ unrelatedNonsense: 'yep yep yep' });
aFactory.create({ hasProps: true, unrelatedNonsense: 'yep yep yep' });

// But this should be legal.
const goodPojo = { hasProps: true, unrelatedNonsense: 'also true' };
aFactory.create(goodPojo);

// This should also be rejected, though for *type error* reasons, not EPC; alas,
// it cannot, for the same reason.
const badPojo = { hasProps: 'huzzah', unrelatedNonsense: 'also true' };
aFactory.create(badPojo);

// ----- FactoryManager ----- //
declare let aFactoryManager: FactoryManager<ConstructThis>;
expectTypeOf(aFactoryManager.class).toEqualTypeOf<Factory<ConstructThis>>();
expectTypeOf(aFactoryManager.create({})).toEqualTypeOf<ConstructThis>();
expectTypeOf(aFactoryManager.create({ hasProps: true })).toEqualTypeOf<ConstructThis>();
expectTypeOf(aFactoryManager.create({ hasProps: false })).toEqualTypeOf<ConstructThis>();

// Likewise with these.
aFactoryManager.create({ otherStuff: 'nope' });
aFactoryManager.create({ hasProps: true, otherStuff: 'nope' });
expectTypeOf(aFactoryManager.create(goodPojo)).toEqualTypeOf<ConstructThis>();
aFactoryManager.create(badPojo);

// ----- Resolver ----- //
declare let resolver: Resolver;
expectTypeOf<Resolver['normalize']>().toEqualTypeOf<
  ((fullName: FullName) => FullName) | undefined
>();
expectTypeOf<Resolver['lookupDescription']>().toEqualTypeOf<
  ((fullName: FullName) => string) | undefined
>();
expectTypeOf(resolver.resolve('random:some-name')).toEqualTypeOf<
  object | Factory<object> | undefined
>();
const knownForFoo = resolver.knownForType?.('foo');
expectTypeOf(knownForFoo).toEqualTypeOf<KnownForTypeResult<'foo'> | undefined>();
expectTypeOf(knownForFoo?.['foo:bar']).toEqualTypeOf<boolean | undefined>();
// @ts-expect-error -- there is no `blah` on `knownForFoo`, *only* `foo`.
knownForFoo?.blah;

// This one is last so it can reuse the bits from above!
// ----- Owner ----- //
declare let owner: Owner;

// @ts-expect-error
owner.lookup();
expectTypeOf(owner.lookup('type:name')).toEqualTypeOf<unknown>();
// @ts-expect-error
owner.lookup('non-namespace-string');
expectTypeOf(owner.lookup('namespace@type:name')).toEqualTypeOf<unknown>();

// Arbitrary registration patterns work, as here.
declare module '@ember/owner' {
  export interface DIRegistry {
    etc: {
      'my-type-test': ConstructThis;
    };
  }
}

expectTypeOf(owner.lookup('etc:my-type-test')).toEqualTypeOf<ConstructThis>();

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

expectTypeOf(owner.factoryFor('type:name')).toEqualTypeOf<FactoryManager<object> | undefined>();
expectTypeOf(owner.factoryFor('type:name')?.class).toEqualTypeOf<Factory<object> | undefined>();
expectTypeOf(owner.factoryFor('type:name')?.create()).toEqualTypeOf<object | undefined>();
expectTypeOf(owner.factoryFor('type:name')?.create({})).toEqualTypeOf<object | undefined>();
expectTypeOf(owner.factoryFor('type:name')?.create({ anythingGoes: true })).toEqualTypeOf<
  object | undefined
>();
// @ts-expect-error
owner.factoryFor('non-namespace-string');
expectTypeOf(owner.factoryFor('namespace@type:name')).toEqualTypeOf<
  FactoryManager<object> | undefined
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

// Check handling with Glimmer components carrying a Signature: they should
// properly resolve to `Owner`, *not* `Owner | undefined`.
interface Sig<T> {
  Args: {
    name: string;
    age: number;
    extra: T;
  };
  Element: HTMLParagraphElement;
  Blocks: {
    default: [greeting: string];
    extra: [T];
  };
}

class ExampleComponent<T> extends Component<Sig<T>> {
  checkThis() {
    expectTypeOf(getOwner(this)).toEqualTypeOf<Owner | undefined>();
  }
}

declare let example: ExampleComponent<string>;
expectTypeOf(getOwner(example)).toEqualTypeOf<Owner | undefined>();

// ----- Minimal further coverage for POJOs ----- //
// `Factory` and `FactoryManager` don't have to deal in actual classes. :sigh:
const Creatable = {
  hasProps: true,
};

const pojoFactory: Factory<typeof Creatable> = {
  // If you want *real* safety here, alas: you cannot have it. The public
  // contract for `create` allows implementors to define their `create` config
  // object basically however they like. As a result, this is the safest version
  // possible: Making it be `Partial<Thing>` is *compatible* with `object`, and
  // requires full checking *inside* the function body. It does not, alas, give
  // any safety *outside* the class. A future rationalization of this would be
  // very welcome.
  create(initialValues?: Partial<typeof Creatable>) {
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
