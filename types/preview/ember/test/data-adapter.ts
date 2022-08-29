import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

const da = Ember.DataAdapter.create();

const filters = da.getFilters();
expectTypeOf(filters.includes({ name: 'foo', desc: 'bar' })).toBeBoolean();
// @ts-expect-error
filters.includes({});

expectTypeOf(filters[0]?.name).toEqualTypeOf<string | undefined>();
expectTypeOf(filters[0]?.desc).toEqualTypeOf<string | undefined>();

// $ExpectType () => void
da.watchModelTypes(
  function added(wrappedTypes) {
    wrappedTypes;
    expectTypeOf(wrappedTypes[0]?.release).toEqualTypeOf<(() => void) | undefined>();
    expectTypeOf(wrappedTypes[0]?.type.columns[0]?.desc).toEqualTypeOf<string | undefined>();
    expectTypeOf(wrappedTypes[0]?.type.columns[0]?.name).toEqualTypeOf<string | undefined>();
    expectTypeOf(wrappedTypes[0]?.type.count).toEqualTypeOf<number | undefined>();
    expectTypeOf(wrappedTypes[0]?.type.name).toEqualTypeOf<string | undefined>();
  },
  function updated(wrappedTypes) {
    wrappedTypes;
    expectTypeOf(wrappedTypes[0]?.release).toEqualTypeOf<(() => void) | undefined>();
    expectTypeOf(wrappedTypes[0]?.type.columns[0]?.desc).toEqualTypeOf<string | undefined>();
    expectTypeOf(wrappedTypes[0]?.type.columns[0]?.name).toEqualTypeOf<string | undefined>();
    expectTypeOf(wrappedTypes[0]?.type.count).toEqualTypeOf<number | undefined>();
    expectTypeOf(wrappedTypes[0]?.type.name).toEqualTypeOf<string | undefined>();
  }
);
// @ts-expect-error
da.watchModelTypes(() => {});

// $ExpectType () => void
da.watchRecords(
  'house',
  function added(records) {
    expectTypeOf(records[0]?.object).toEqualTypeOf<object | undefined>();
    expectTypeOf(records[0]?.columnValues).toEqualTypeOf<object | undefined>();
  },
  function updated(records) {
    expectTypeOf(records[0]?.object).toEqualTypeOf<object | undefined>();
    expectTypeOf(records[0]?.columnValues).toEqualTypeOf<object | undefined>();
  },
  function removed(idx, count) {
    idx; // $ExpectType number
    count; // $ExpectType number
  }
);
// @ts-expect-error
da.watchRecords(() => {});

da.acceptsModelName; // $ExpectType boolean
da.containerDebugAdapter; // $ExpectType ContainerDebugAdapter

const ca: Ember.ContainerDebugAdapter = da.containerDebugAdapter;
ca.canCatalogEntriesByType('controller'); // $ExpectType boolean
ca.catalogEntriesByType('controller'); // $ExpectType string[]
