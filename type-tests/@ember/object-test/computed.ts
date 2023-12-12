import EmberObject, { computed } from '@ember/object';
import {
  alias,
  or,
  and,
  filter,
  equal,
  empty,
  filterBy,
  notEmpty,
  none,
  not,
  min,
  max,
  gt,
  gte,
  lt,
  lte,
  readOnly,
  reads,
  setDiff,
  sort,
  intersect,
  mapBy,
  match,
  map,
  oneWay,
  sum,
  union,
  uniqBy,
  uniq,
  deprecatingAlias,
  bool,
  collect,
} from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

function customMacro(message: string) {
  return computed(() => {
    return [message, message];
  });
}

class Person extends EmberObject {
  firstName = '';
  lastName = '';
  age = 0;

  // Equivalent to a per-instance `defineProperty` call.
  @computed()
  get noArgs() {
    return 'test';
  }

  @computed('firstName', 'lastName')
  get fullName(): string {
    return `${this.get('firstName')} ${this.get('lastName')}`;
  }

  @computed('fullName').readOnly()
  get fullNameReadonly() {
    return this.get('fullName');
  }

  @computed('firstName', 'lastName')
  get fullNameWritable(): string {
    return this.get('fullName');
  }

  set fullNameWritable(value: string) {
    const [first, last] = value.split(' ');
    this.set('firstName', first);
    this.set('lastName', last);
  }

  @computed().meta({ foo: 'bar' }).readOnly()
  get combinators() {
    return this.get('firstName');
  }

  @alias('fullName')
  declare explicitlyDeclared: string;

  @customMacro('hi')
  declare hiTwice: string[];
}

const person = Person.create({
  firstName: 'Fred',
  lastName: 'Smith',
  age: 29,
});

expectTypeOf(person.firstName).toEqualTypeOf<string>();
expectTypeOf(person.age).toEqualTypeOf<number>();
expectTypeOf(person.noArgs).toEqualTypeOf<string>();
expectTypeOf(person.fullName).toEqualTypeOf<string>();
expectTypeOf(person.fullNameReadonly).toEqualTypeOf<string>();
expectTypeOf(person.fullNameWritable).toEqualTypeOf<string>();
expectTypeOf(person.combinators).toEqualTypeOf<string>();
expectTypeOf(person.explicitlyDeclared).toEqualTypeOf<string>();

expectTypeOf(person.get('firstName')).toEqualTypeOf<string>();
expectTypeOf(person.get('age')).toEqualTypeOf<number>();
expectTypeOf(person.get('noArgs')).toEqualTypeOf<string>();
expectTypeOf(person.get('fullName')).toEqualTypeOf<string>();
expectTypeOf(person.get('fullNameReadonly')).toEqualTypeOf<string>();
expectTypeOf(person.get('fullNameWritable')).toEqualTypeOf<string>();
expectTypeOf(person.get('combinators')).toEqualTypeOf<string>();
expectTypeOf(person.get('explicitlyDeclared')).toEqualTypeOf<string>();

expectTypeOf(person.getProperties('firstName', 'fullName', 'age')).toMatchTypeOf<{
  firstName: string;
  fullName: string;
  age: number;
}>();

const person2 = Person.create({
  fullName: 'Fred Smith',
});

expectTypeOf(person2.get('firstName')).toEqualTypeOf<string>();
expectTypeOf(person2.get('fullName')).toEqualTypeOf<string>();

const person3 = Person.extend({
  firstName: 'Fred',
  fullName: 'Fred Smith',
}).create();

expectTypeOf(person3.get('firstName')).toEqualTypeOf<string>();
expectTypeOf(person3.get('fullName')).toEqualTypeOf<string>();

const person4 = Person.extend({
  firstName: computed(() => 'Fred'),
  fullName: computed(() => 'Fred Smith'),
}).create();

expectTypeOf(person4.get('firstName')).toEqualTypeOf<string>();
expectTypeOf(person4.get('fullName')).toEqualTypeOf<string>();

// computed property macros
class Bar extends EmberObject {
  declare firstName: string;
  declare last: string;

  declare values: number[];

  // @ts-expect-error
  @alias declare aliasTest0: string;
  // @ts-expect-error
  @alias() declare aliasTest1: string;
  @alias('firstName') declare aliasTest2: string;

  // @ts-expect-error
  @and declare andTest0: boolean;
  // @ts-expect-error
  @and() declare andTest1: boolean;
  @and('firstName') declare andTest2: boolean;
  @and('firstName', 'lastName') declare andTest3: boolean;

  // @ts-expect-error
  @bool declare boolTest0: boolean;
  // @ts-expect-error
  @bool() declare boolTest1: boolean;
  @bool('firstName') declare boolTest2: boolean;

  // @ts-expect-error
  @collect declare collectTest0: unknown[];
  // @ts-expect-error
  @collect() declare collectTest1: unknown[];
  @collect('firstName') declare collectTest2: string[];

  // @ts-expect-error
  @deprecatingAlias declare deprecatingAliasTest0: string;
  // @ts-expect-error
  @deprecatingAlias() declare deprecatingAliasTest1: string;
  // @ts-expect-error
  @deprecatingAlias('firstName') declare deprecatingAliasTest2: string;
  @deprecatingAlias('firstName', {
    id: 'deprecate-everything',
    until: 'v5.0.0',
    for: 'test',
    since: { available: '5.1.0', enabled: '5.3.0' },
  })
  declare deprecatingAliasTest3: string;

  // @ts-expect-error
  @empty declare emptyTest0: boolean;
  // @ts-expect-error
  @empty() declare emptyTest1: boolean;
  @empty('firstName') declare emptyTest2: boolean;

  // @ts-expect-error
  @equal declare equalTest0: boolean;
  // @ts-expect-error
  @equal() declare equalTest1: boolean;
  // @ts-expect-error
  @equal('firstName') declare equalTest2: boolean;
  @equal('firstName', 'lastName') declare equalTest3: boolean;

  // @ts-expect-error
  @filter declare filterTest1: string[];
  // @ts-expect-error
  @filter() declare filterTest2: string[];
  // @ts-expect-error
  @filter('firstName') declare filterTest3: string[];
  @filter('firstName', Boolean) declare filterTest4: string[];
  // @ts-expect-error
  @filter('firstName', 'secondName', (x) => x) declare filterTest5: string[];
  @filter('firstName', ['secondName'], Boolean) declare filterTest6: string[];

  // @ts-expect-error
  @filterBy declare filterByTest1: unknown[];
  // @ts-expect-error
  @filterBy() declare filterByTest2: unknown[];
  // @ts-expect-error
  @filterBy('firstName') declare filterByTest3: string[];
  @filterBy('firstName', 'id') declare filterByTest4: string[];

  // @ts-expect-error
  @gt declare gtTest1: boolean;
  // @ts-expect-error
  @gt() declare gtTest2: boolean;
  // @ts-expect-error
  @gt('firstName') declare gtTest3: boolean;
  @gt('firstName', 3) declare gtTest4: boolean;

  // @ts-expect-error
  @gte declare gteTest1: boolean;
  // @ts-expect-error
  @gte() declare gteTest2: boolean;
  // @ts-expect-error
  @gte('firstName') declare gteTest3: boolean;
  @gte('firstName', 3) declare gteTest4: boolean;

  // @ts-expect-error
  @intersect declare intersectTest1: any;
  // @ts-expect-error
  @intersect() declare intersectTest2: any;
  @intersect('firstName') declare intersectTest3: any;
  @intersect('firstName', 'lastName') declare intersectTest4: any;

  // @ts-expect-error
  @lt declare ltTest1: boolean;
  // @ts-expect-error
  @lt() declare ltTest2: boolean;
  // @ts-expect-error
  @lt('firstName') declare ltTest3: boolean;
  @lt('firstName', 3) declare ltTest4: boolean;

  // @ts-expect-error
  @lte declare lteTest1: boolean;
  // @ts-expect-error
  @lte() declare lteTest2: boolean;
  // @ts-expect-error
  @lte('firstName') declare lteTest3: boolean;
  @lte('firstName', 3) declare lteTest4: boolean;

  // @ts-expect-error
  @map declare mapTest1: string[];
  // @ts-expect-error
  @map() declare mapTest2: string[];
  // @ts-expect-error
  @map('firstName') declare mapTest3: string[];
  @map('firstName', (x) => x) declare mapTest4: string[];

  // @ts-expect-error
  @mapBy declare mapByTest1: any[];
  // @ts-expect-error
  @mapBy() declare mapByTest2: any[];
  // @ts-expect-error
  @mapBy('firstName') declare mapByTest3: any[];
  @mapBy('firstName', 'id') declare mapByTest4: any[];

  // @ts-expect-error
  @match declare matchTest1: boolean;
  // @ts-expect-error
  @match() declare matchTest2: boolean;
  // @ts-expect-error
  @match('firstName') declare matchTest3: boolean;
  // @ts-expect-error
  @match('firstName', 'abc') declare matchTest4: boolean;
  @match('firstName', /\s+/) declare matchTest5: boolean;

  // @ts-expect-error
  @max declare maxTest1: number;
  // @ts-expect-error
  @max() declare maxTest2: number;
  @max('values') declare maxTest3: number;
  // @ts-expect-error
  @max('values', 'a') declare maxTest4: number;

  // @ts-expect-error
  @min declare minTest1: number;
  // @ts-expect-error
  @min() declare minTest2: number;
  @min('values') declare minTest3: number;
  // @ts-expect-error
  @min('values', 'a') declare minTest4: number;

  // @ts-expect-error
  @none declare noneTest1: number;
  // @ts-expect-error
  @none() declare noneTest2: number;
  @none('values') declare noneTest3: number;
  // @ts-expect-error
  @none('values', 'a') declare noneTest4: number;

  // @ts-expect-error
  @not declare notTest1: number;
  // @ts-expect-error
  @not() declare notTest2: number;
  @not('values') declare notTest3: number;
  // @ts-expect-error
  @not('values', 'a') declare notTest4: number;

  // @ts-expect-error
  @notEmpty declare notEmptyTest1: boolean;
  // @ts-expect-error
  @notEmpty() declare notEmptyTest2: boolean;
  @notEmpty('firstName') declare notEmptyTest3: boolean;
  // @ts-expect-error
  @notEmpty('firstName', 'a') declare notEmptyTest4: boolean;

  // @ts-expect-error
  @oneWay declare oneWayTest1: boolean;
  // @ts-expect-error
  @oneWay() declare oneWayTest2: boolean;
  @oneWay('firstName') declare oneWayTest3: boolean;
  // @ts-expect-error
  @oneWay('firstName', 'b') declare oneWayTest4: boolean;

  // @ts-expect-error
  @or declare orTest1: boolean;
  // @ts-expect-error
  @or() declare orTest2: boolean;
  @or('firstName') declare orTest3: boolean;
  @or('firstName', 'lastName') declare orTest4: boolean;

  // @ts-expect-error
  @readOnly declare readOnlyTest1: boolean;
  // @ts-expect-error
  @readOnly() declare readOnlyTest2: boolean;
  @readOnly('firstName') declare readOnlyTest3: boolean;

  // @ts-expect-error
  @reads declare readsTest1: boolean;
  // @ts-expect-error
  @reads() declare readsTest2: boolean;
  @reads('firstName') declare readsTest3: boolean;
  // @ts-expect-error
  @reads('firstName', 'a') declare readsTest4: boolean;

  // @ts-expect-error
  @setDiff declare setDiffTest1: number;
  // @ts-expect-error
  @setDiff() declare setDiffTest2: number;
  // @ts-expect-error
  @setDiff('values') declare setDiffTest3: number;
  @setDiff('values', 'otherThing') declare setDiffTest4: number;
  // @ts-expect-error
  @setDiff('values', 'otherThing', 'a') declare setDiffTest5: number;

  // @ts-expect-error
  @sort declare sortTest1: number;
  // @ts-expect-error
  @sort() declare sortTest2: number;
  // @ts-expect-error
  @sort('values') declare sortTest3: number;
  @sort('values', 'id') declare sortTest4: number;
  // @ts-expect-error
  @sort('values', 'id', 'a') declare sortTest5: number;
  @sort('values', (a: number, b: number) => a - b) declare sortTest6: number;
  @sort('values', ['id'], (a: number, b: number) => a - b) declare sortTest7: number;
  // @ts-expect-error
  @sort('values', 'id', (a, b) => a - b) declare sortTest8: number;
  // @ts-expect-error
  @sort(['id'], (a, b) => a - b) declare sortTest9: number;

  // @ts-expect-error
  @sum declare sumTest1: number;
  // @ts-expect-error
  @sum() declare sumTest2: number;
  @sum('values') declare sumTest3: number;

  // @ts-expect-error
  @union declare unionTest1: never;
  // @ts-expect-error
  @union() declare unionTest2: [];
  @union('firstName') declare unionTest3: string[];
  @union('firstName', 'lastName') declare unionTest4: string[];

  // @ts-expect-error
  @uniq declare uniqTest1: number;
  // @ts-expect-error
  @uniq() declare uniqTest2: number;
  @uniq('values') declare uniqTest3: number;

  // @ts-expect-error
  @uniqBy declare uniqByTest1: number;
  // @ts-expect-error
  @uniqBy() declare uniqByTest2: number;
  // @ts-expect-error
  @uniqBy('values') declare uniqByTest3: number;
  @uniqBy('values', 'id') declare uniqByTest4: number;
}
