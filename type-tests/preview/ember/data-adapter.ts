import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

const da = Ember.DataAdapter.create();

const filters = da.getFilters();
expectTypeOf(filters.includes({ name: 'foo', desc: 'bar' })).toBeBoolean();
// @ts-expect-error
filters.includes({});

expectTypeOf(filters[0]?.name).toEqualTypeOf<string | undefined>();
expectTypeOf(filters[0]?.desc).toEqualTypeOf<string | undefined>();

expectTypeOf(
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
  )
).toEqualTypeOf<() => void>();
// @ts-expect-error
da.watchModelTypes(() => {});

expectTypeOf(
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
      expectTypeOf(idx).toBeNumber();
      expectTypeOf(count).toBeNumber();
    }
  )
).toEqualTypeOf<() => void>();
// @ts-expect-error
da.watchRecords(() => {});

expectTypeOf(da.acceptsModelName).toEqualTypeOf<boolean>();
expectTypeOf(da.containerDebugAdapter).toEqualTypeOf<Ember.ContainerDebugAdapter>();

const ca: Ember.ContainerDebugAdapter = da.containerDebugAdapter;
expectTypeOf(ca.canCatalogEntriesByType('controller')).toEqualTypeOf<boolean>();
expectTypeOf(ca.catalogEntriesByType('controller')).toEqualTypeOf<string[]>();
