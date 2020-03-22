import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
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
    ['@test and throws an error if used without parameters']() {
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

    ['@test bool throws an error if used without parameters']() {
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

    ['@test deprecatingAlias throws an error if used without parameters']() {
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

    ['@test equal throws an error if used without parameters']() {
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

    ['@test gt throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @gt foo;
        }

        new Foo();
      }, /You attempted to use @gt/);
    }

    ['@test gte throws an error if used without parameters']() {
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

    ['@test lt throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @lt foo;
        }

        new Foo();
      }, /You attempted to use @lt/);
    }

    ['@test lte throws an error if used without parameters']() {
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

    ['@test match throws an error if used without parameters']() {
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

    ['@test not throws an error if used without parameters']() {
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

    ['@test oneWay throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @oneWay foo;
        }

        new Foo();
      }, /You attempted to use @oneWay/);
    }

    ['@test or throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @or foo;
        }

        new Foo();
      }, /You attempted to use @or/);
    }

    ['@test readOnly throws an error if used without parameters']() {
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

    ['@test alias throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @alias foo;
        }

        new Foo();
      }, /You attempted to use @alias/);
    }
  }
);
