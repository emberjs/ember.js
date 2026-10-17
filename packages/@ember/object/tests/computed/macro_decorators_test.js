import { moduleFor, AbstractTestCase, testUnless } from 'internal-test-helpers';
import { alias } from '@ember/-internals/metal';
import {
  and,
  bool,
  collect,
  deprecatingAlias,
  empty,
  equal,
  filter,
  filterBy,
  gt,
  gte,
  intersect,
  lt,
  lte,
  map,
  mapBy,
  match,
  max,
  min,
  not,
  notEmpty,
  oneWay,
  or,
  readOnly,
  setDiff,
  sort,
  sum,
  union,
  uniq,
  uniqBy,
} from '@ember/object/computed';

moduleFor(
  'computed macros - decorators - assertions',
  class extends AbstractTestCase {
    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test and throws an error if used without parameters`]() {
      expectAssertion(() => {
        class Foo {
          @and foo;
        }

        new Foo();
      }, /You attempted to use @and/);
    }

    ['@test alias throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @alias foo;
        }

        new Foo();
      }, /You attempted to use @alias/);
    }

    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test bool throws an error if used without parameters`]() {
      expectAssertion(() => {
        class Foo {
          @bool foo;
        }

        new Foo();
      }, /You attempted to use @bool/);
    }

    ['@test collect throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @collect foo;
        }

        new Foo();
      }, /You attempted to use @collect/);
    }

    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test deprecatingAlias throws an error if used without parameters`]() {
      expectAssertion(() => {
        class Foo {
          @deprecatingAlias foo;
        }

        new Foo();
      }, /You attempted to use @deprecatingAlias/);
    }

    ['@test empty throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @empty foo;
        }

        new Foo();
      }, /You attempted to use @empty/);
    }

    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test equal throws an error if used without parameters`]() {
      expectAssertion(() => {
        class Foo {
          @equal foo;
        }

        new Foo();
      }, /You attempted to use @equal/);
    }

    ['@test filter throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @filter foo;
        }

        new Foo();
      }, /You attempted to use @filter/);
    }

    ['@test filterBy throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @filterBy foo;
        }

        new Foo();
      }, /You attempted to use @filterBy/);
    }

    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test gt throws an error if used without parameters`]() {
      expectAssertion(() => {
        class Foo {
          @gt foo;
        }

        new Foo();
      }, /You attempted to use @gt/);
    }

    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test gte throws an error if used without parameters`]() {
      expectAssertion(() => {
        class Foo {
          @gte foo;
        }

        new Foo();
      }, /You attempted to use @gte/);
    }

    ['@test intersect throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @intersect foo;
        }

        new Foo();
      }, /You attempted to use @intersect/);
    }

    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test lt throws an error if used without parameters`]() {
      expectAssertion(() => {
        class Foo {
          @lt foo;
        }

        new Foo();
      }, /You attempted to use @lt/);
    }

    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test lte throws an error if used without parameters`]() {
      expectAssertion(() => {
        class Foo {
          @lte foo;
        }

        new Foo();
      }, /You attempted to use @lte/);
    }

    ['@test map throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @map foo;
        }

        new Foo();
      }, /You attempted to use @map/);
    }

    ['@test mapBy throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @mapBy foo;
        }

        new Foo();
      }, /You attempted to use @mapBy/);
    }

    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test match throws an error if used without parameters`]() {
      expectAssertion(() => {
        class Foo {
          @match foo;
        }

        new Foo();
      }, /You attempted to use @match/);
    }

    ['@test max throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @max foo;
        }

        new Foo();
      }, /You attempted to use @max/);
    }

    ['@test min throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @min foo;
        }

        new Foo();
      }, /You attempted to use @min/);
    }

    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test not throws an error if used without parameters`]() {
      expectAssertion(() => {
        class Foo {
          @not foo;
        }

        new Foo();
      }, /You attempted to use @not/);
    }

    ['@test notEmpty throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @notEmpty foo;
        }

        new Foo();
      }, /You attempted to use @notEmpty/);
    }

    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test oneWay throws an error if used without parameters`]() {
      expectAssertion(() => {
        class Foo {
          @oneWay foo;
        }

        new Foo();
      }, /You attempted to use @oneWay/);
    }

    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test or throws an error if used without parameters`]() {
      expectAssertion(() => {
        class Foo {
          @or foo;
        }

        new Foo();
      }, /You attempted to use @or/);
    }

    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test readOnly throws an error if used without parameters`]() {
      expectAssertion(() => {
        class Foo {
          @readOnly foo;
        }

        new Foo();
      }, /You attempted to use @readOnly/);
    }

    ['@test setDiff throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @setDiff foo;
        }

        new Foo();
      }, /You attempted to use @setDiff/);
    }

    ['@test sort throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @sort foo;
        }

        new Foo();
      }, /You attempted to use @sort/);
    }

    ['@test sum throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @sum foo;
        }

        new Foo();
      }, /You attempted to use @sum/);
    }

    ['@test union throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @union foo;
        }

        new Foo();
      }, /You attempted to use @uniq\/@union/);
    }

    ['@test uniq throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @uniq foo;
        }

        new Foo();
      }, /You attempted to use @uniq\/@union/);
    }

    ['@test uniqBy throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @uniqBy foo;
        }

        new Foo();
      }, /You attempted to use @uniqBy/);
    }
  }
);
