import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { alias } from '@ember/-internals/metal';
import {
  and,
  bool,
  deprecatingAlias,
  equal,
  gt,
  gte,
  lt,
  lte,
  match,
  not,
  oneWay,
  or,
  readOnly,
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

    ['@test deprecatingAlias throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @deprecatingAlias foo;
        }

        new Foo();
      }, /You attempted to use @deprecatingAlias/);
    }

    ['@test equal throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @equal foo;
        }

        new Foo();
      }, /You attempted to use @equal/);
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

    ['@test match throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @match foo;
        }

        new Foo();
      }, /You attempted to use @match/);
    }

    ['@test not throws an error if used without parameters']() {
      expectAssertion(() => {
        class Foo {
          @not foo;
        }

        new Foo();
      }, /You attempted to use @not/);
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
  }
);
