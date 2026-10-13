// gxt NATIVE layer: helpers through the native helper manager
// (native/helper-manager.ts, gxt G4) — plain functions (Ember's default helper
// manager), class `Helper` (+ recompute / destroy / owner), `helper()`,
// `setHelperManager` custom managers, `invokeHelper`, the `@ember/helper`
// built-ins and the keyword helpers (Ember toBool / value semantics, G-kw).
import { DEBUG } from '@glimmer/env';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import Helper, { helper as functionHelper } from '@ember/component/helper';
import {
  array,
  capabilities as helperCapabilities,
  concat,
  element,
  fn,
  get,
  hash,
  invokeHelper,
  setHelperManager,
  uniqueId,
} from '@ember/helper';
import { registerDestructor } from '@ember/destroyable';
import { getValue } from '@glimmer/tracking/primitives/cache';
import { getInternalModifierManager } from '@glimmer/manager';
import { on } from '@ember/modifier';
import Service, { service } from '@ember/service';
import { run } from '@ember/runloop';
import { setupNativeRendering, textOf, htmlOf } from './-helpers';

const { module, test } = QUnit;

module('gxt-native | helpers', function (hooks) {
  setupNativeRendering(hooks);

  test('plain function: positional args, named args as a trailing hash (only when present)', function (assert) {
    const seen = [];
    const fmt = (...args) => {
      seen.push(args);
      return args.length;
    };
    class Root extends Component {
      a = 'x';
      <template>
        <i>{{fmt this.a 2}}</i>
        <b>{{fmt this.a currency="USD"}}</b>
      </template>
    }
    this.render(Root);
    assert.strictEqual(htmlOf(this.element).replace(/\s+/g, ''), '<i>2</i><b>2</b>');
    assert.deepEqual(seen[0], ['x', 2], 'no trailing hash without named args');
    assert.strictEqual(seen[1][0], 'x');
    assert.deepEqual({ ...seen[1][1] }, { currency: 'USD' }, 'named args = trailing hash');
  });

  test('plain function: the named object goes only to a call site with named args (even an undefined one) and reads current values', function (assert) {
    const seen = [];
    let root;
    const fmt = (...args) => {
      seen.push(args);
      const last = args[args.length - 1];
      // reading a named value consumes it (Glimmer: only what the helper reads)
      return typeof last === 'object' ? `${args.length}:${last.unit}` : `${args.length}`;
    };
    class Root extends Component {
      @tracked a = 'x';
      @tracked unit = 'USD';
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>
        <i>{{fmt}}</i>
        <b>{{fmt this.a}}</b>
        <s>{{fmt this.a unit=this.unit}}</s>
        <u>{{fmt unit=undefined}}</u>
      </template>
    }
    this.render(Root);
    assert.strictEqual(
      htmlOf(this.element).replace(/\s+/g, ''),
      '<i>0</i><b>1</b><s>2:USD</s><u>1:undefined</u>'
    );
    assert.deepEqual(seen[0], [], 'no arguments at all');
    assert.deepEqual(seen[1], ['x'], 'positional only: no trailing object');
    const [, withUnit] = seen[2];
    assert.deepEqual({ ...withUnit }, { unit: 'USD' }, 'the named object');
    assert.deepEqual(Object.keys(seen[3][0]), ['unit'], 'a named arg whose value is undefined still counts');
    assert.strictEqual(seen[3][0].unit, undefined);
    run(() => (root.unit = 'EUR'));
    assert.strictEqual(seen.length, 5, 'only the call site reading `unit` recomputed');
    assert.strictEqual(this.element.querySelector('s').textContent, '2:EUR');
    assert.strictEqual(seen[4][1], withUnit, 'the same named object, reading the current value');
  });

  test('plain function: computed ONCE per render, recomputed once per argument change', function (assert) {
    let count = 0;
    let root;
    const double = (n) => {
      count++;
      return n * 2;
    };
    class Root extends Component {
      @tracked n = 1;
      @tracked other = 'a';
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>{{double this.n}} {{this.other}}</template>
    }
    this.render(Root);
    assert.strictEqual(textOf(this.element), '2 a');
    assert.strictEqual(count, 1, 'rendered once');
    run(() => (root.other = 'b'));
    assert.strictEqual(textOf(this.element), '2 b');
    assert.strictEqual(count, 1, 'an unrelated change does not recompute');
    run(() => (root.n = 5));
    assert.strictEqual(textOf(this.element), '10 b');
    assert.strictEqual(count, 2, 'recomputed once');
  });

  test('class Helper: owner injection, compute(positional, named), recompute(), destroy with its block', function (assert) {
    class Greeting extends Service {
      word = 'Hello';
    }
    this.owner.register('service:greeting', Greeting);
    let instances = [];
    let computeCount = 0;
    class Greet extends Helper {
      @service greeting;
      suffix = '!';
      constructor() {
        super(...arguments);
        instances.push(this);
      }
      compute([name], { punct }) {
        computeCount++;
        return `${this.greeting.word}, ${name}${punct ?? this.suffix}`;
      }
      willDestroy() {
        assert.step('willDestroy');
        super.willDestroy();
      }
    }
    let root;
    class Root extends Component {
      @tracked show = true;
      @tracked name = 'Tom';
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>{{#if this.show}}<p>{{Greet this.name punct="?"}}</p>{{/if}}</template>
    }
    this.render(Root);
    assert.strictEqual(textOf(this.element), 'Hello, Tom?');
    assert.strictEqual(instances.length, 1, 'one instance per call site');
    assert.strictEqual(computeCount, 1, 'computed once on render');

    run(() => (root.name = 'Ann'));
    assert.strictEqual(textOf(this.element), 'Hello, Ann?');
    assert.strictEqual(instances.length, 1, 'the instance is kept across updates');
    assert.strictEqual(computeCount, 2);

    run(() => instances[0].recompute());
    assert.strictEqual(computeCount, 3, 'recompute() re-runs compute');

    run(() => (root.show = false));
    assert.verifySteps(['willDestroy'], 'destroyed with its block');
    assert.true(instances[0].isDestroyed);
  });

  test('class Helper: one instance per each row, destroyed per removed row', function (assert) {
    const made = [];
    class Label extends Helper {
      constructor() {
        super(...arguments);
        made.push(this);
      }
      compute([item]) {
        return `#${item.id}`;
      }
    }
    const one = { id: 1 };
    const two = { id: 2 };
    const three = { id: 3 };
    let root;
    class Root extends Component {
      @tracked items = [one, two, three];
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>{{#each this.items as |it|}}<b>{{Label it}}</b>{{/each}}</template>
    }
    this.render(Root);
    assert.strictEqual(textOf(this.element), '#1#2#3');
    assert.strictEqual(made.length, 3);
    run(() => (root.items = [one, three]));
    assert.strictEqual(textOf(this.element), '#1#3');
    assert.deepEqual(
      made.map((h) => h.isDestroyed),
      [false, true, false],
      'only the removed row helper is destroyed'
    );
  });

  test('helper() function-based helper receives (positional, named)', function (assert) {
    const join = functionHelper(([a, b], { sep }) => `${a}${sep}${b}`);
    const Root = <template>{{join "x" "y" sep="-"}}</template>;
    this.render(Root);
    assert.strictEqual(textOf(this.element), 'x-y');
  });

  test('setHelperManager: createHelper once per call site, getValue on change, destroyable with the block', function (assert) {
    class Manager {
      capabilities = helperCapabilities('3.23', { hasValue: true, hasDestroyable: true });
      constructor(owner) {
        this.owner = owner;
      }
      createHelper(definition, args) {
        assert.step('createHelper');
        const bucket = { definition, args, destroyable: {} };
        registerDestructor(bucket.destroyable, () => assert.step('destroyed'));
        return bucket;
      }
      getValue({ definition, args }) {
        assert.step('getValue');
        return definition.compute(args.positional[0], args.named.k);
      }
      getDestroyable(bucket) {
        return bucket.destroyable;
      }
    }
    let ownerSeen;
    const def = setHelperManager((owner) => {
      ownerSeen = owner;
      return new Manager(owner);
    }, { compute: (a, k) => `${a}:${k}` });

    let root;
    class Root extends Component {
      @tracked show = true;
      @tracked a = 1;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>{{#if this.show}}{{def this.a k="z"}}{{/if}}</template>
    }
    this.render(Root);
    assert.strictEqual(textOf(this.element), '1:z');
    assert.strictEqual(ownerSeen, this.owner, 'the manager factory receives the owner');
    assert.verifySteps(['createHelper', 'getValue']);
    run(() => (root.a = 2));
    assert.strictEqual(textOf(this.element), '2:z');
    assert.verifySteps(['getValue'], 'no new helper on update');
    run(() => (root.show = false));
    assert.verifySteps(['destroyed']);
  });

  test('invokeHelper: a helper driven from JS, destroyed with its parent', function (assert) {
    class Plus extends Helper {
      compute([a, b]) {
        return a + b;
      }
      willDestroy() {
        assert.step('helper destroyed');
        super.willDestroy();
      }
    }
    let root;
    class Root extends Component {
      @tracked show = true;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>{{#if this.show}}<Sum />{{/if}}</template>
    }
    let sum;
    class Sum extends Component {
      @tracked a = 1;
      cache = invokeHelper(this, Plus, () => ({ positional: [this.a, 10] }));
      constructor(owner, args) {
        super(owner, args);
        sum = this;
      }
      get value() {
        return getValue(this.cache);
      }
      <template><output>{{this.value}}</output></template>
    }
    this.render(Root);
    assert.strictEqual(textOf(this.element), '11');
    run(() => (sum.a = 5));
    assert.strictEqual(textOf(this.element), '15');
    run(() => (root.show = false));
    assert.verifySteps(['helper destroyed']);
  });

  test('hash / array / concat / get: render and update', function (assert) {
    let root;
    const Show = <template>{{@h.a}}-{{@h.b}}|{{@list.length}}:{{get @list 1}}</template>;
    class Root extends Component {
      @tracked a = 'A';
      @tracked key = 'name';
      obj = { name: 'n1', title: 't1' };
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>
        <Show @h={{hash a=this.a b=2}} @list={{array 1 this.a 3}} />
        <i>{{concat "x" this.a null "y"}}</i>
        <b>{{get this.obj this.key}}</b>
      </template>
    }
    this.render(Root);
    const parts = () => [
      // (the whitespace between <Show> and <i> renders, as in Glimmer)
      textOf(this.element).split('x')[0].trim(),
      this.element.querySelector('i').textContent,
      this.element.querySelector('b').textContent,
    ];
    assert.deepEqual(parts(), ['A-2|3:A', 'xAy', 'n1']);
    run(() => {
      root.a = 'B';
      root.key = 'title';
    });
    assert.deepEqual(parts(), ['B-2|3:B', 'xBy', 't1']);
  });

  test('fn: partial application, arguments read when invoked, stable identity', function (assert) {
    const calls = [];
    const handlers = new Set();
    let root;
    let child;
    class Child extends Component {
      constructor(owner, args) {
        super(owner, args);
        child = this;
      }
      get handler() {
        handlers.add(this.args.go);
        return '';
      }
      <template>{{this.handler}}</template>
    }
    class Root extends Component {
      @tracked x = 1;
      @tracked other = 0;
      go = (...args) => calls.push(args);
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template><Child @go={{fn this.go "a" this.x}} />{{this.other}}</template>
    }
    this.render(Root);
    child.args.go('b');
    run(() => (root.x = 2));
    child.args.go('c');
    run(() => root.other++);
    assert.deepEqual(calls, [
      ['a', 1, 'b'],
      ['a', 2, 'c'],
    ]);
    assert.strictEqual(handlers.size, 1, 'the fn result keeps its identity');
  });

  test('fn in {{on}}: the callback and bound args are read when invoked; the listener is never re-attached', function (assert) {
    const calls = [];
    const counters = () => ({ ...getInternalModifierManager(on).counters });
    const start = counters();
    let root;
    class Root extends Component {
      @tracked rows = [
        { id: 1, label: 'a' },
        { id: 2, label: 'b' },
      ];
      @tracked select = (row, extra, evt) => calls.push(['first', row.label, extra, evt.type]);
      @tracked extra = 1;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>
        {{#each this.rows key="id" as |row|}}
          <button {{on "click" (fn this.select row this.extra)}}>{{row.label}}</button>
        {{/each}}
      </template>
    }
    this.render(Root);
    const click = (i) => run(() => this.element.querySelectorAll('button')[i].click());
    click(1);
    run(() => (root.extra = 2));
    click(0);
    run(() => (root.select = (row, extra) => calls.push(['second', row.label, extra])));
    click(1);
    assert.deepEqual(calls, [
      ['first', 'b', 1, 'click'],
      ['first', 'a', 2, 'click'],
      ['second', 'b', 2],
    ]);
    const end = counters();
    assert.strictEqual(end.adds - start.adds, 2, 'one listener per row');
    assert.strictEqual(end.removes - start.removes, 0, 'never re-attached');
  });

  if (DEBUG) {
    test('fn asserts (DEV) when its first argument is undefined', function (assert) {
      const missing = undefined;
      const Child = <template>{{if @go "set"}}</template>;
      assert.throws(
        () => this.render(<template><Child @go={{fn missing 1}} /></template>),
        /You must pass a function as the `fn` helper's first argument, you passed undefined\./
      );
    });

    test('fn asserts (DEV) when its first argument is null', function (assert) {
      const empty = null;
      const Child = <template>{{if @go "set"}}</template>;
      assert.throws(
        () => this.render(<template><Child @go={{fn empty}} /></template>),
        /You must pass a function as the `fn` helper's first argument, you passed null\./
      );
    });

    test('fn asserts (DEV) when its callback stops being a function before it is invoked', function (assert) {
      let root;
      let child;
      class Child extends Component {
        constructor(owner, args) {
          super(owner, args);
          child = this;
        }
        <template>{{if @go "set"}}</template>
      }
      class Root extends Component {
        @tracked go = () => 'ok';
        constructor(owner, args) {
          super(owner, args);
          root = this;
        }
        <template><Child @go={{fn this.go}} /></template>
      }
      this.render(Root);
      assert.strictEqual(child.args.go(), 'ok');
      const stashed = child.args.go;
      run(() => (root.go = 'nope'));
      assert.throws(
        () => stashed(),
        /You must pass a function as the `fn` helper's first argument, you passed nope\./
      );
    });
  }

  test('keyword helpers use Ember toBool and return values (and / or / not / if / eq)', function (assert) {
    let root;
    class Root extends Component {
      @tracked list = [];
      @tracked flag = true;
      <template>
        <i>{{if (and this.list this.flag) "yes" "no"}}</i>
        <b>{{or this.list "fallback"}}</b>
        <s>{{if (not this.list) "empty" "full"}}</s>
        <u>{{if this.list "y" "n"}}</u>
        <em>{{if (eq this.flag true) "eq" "neq"}}</em>
      </template>
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
    }
    this.render(Root);
    const shown = () => [...this.element.querySelectorAll('i, b, s, u, em')].map((e) => e.textContent);
    assert.deepEqual(shown(), ['no', 'fallback', 'empty', 'n', 'eq']);
    run(() => (root.list = [1]));
    assert.deepEqual(shown(), ['yes', '1', 'full', 'y', 'eq']);
  });

  test('unbound comparison keywords (neq / gt / lt) resolve to the Ember helpers', function (assert) {
    const Root = <template>{{if (neq 1 2) "neq"}} {{if (gt 2 1) "gt"}} {{if (lt 2 1) "lt" "not-lt"}}</template>;
    this.render(Root);
    assert.strictEqual(textOf(this.element), 'neq gt not-lt');
  });

  test('uniqueId (internal helper) is stable per call site across re-renders', function (assert) {
    let root;
    class Root extends Component {
      @tracked n = 0;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template><i>{{uniqueId}}</i><b>{{uniqueId}}</b>{{this.n}}</template>
    }
    this.render(Root);
    const first = [...this.element.querySelectorAll('i, b')].map((e) => e.textContent);
    assert.notStrictEqual(first[0], first[1], 'distinct call sites, distinct ids');
    run(() => root.n++);
    const second = [...this.element.querySelectorAll('i, b')].map((e) => e.textContent);
    assert.deepEqual(second, first, 'stable across re-renders');
  });

  test('a function VALUE returned by a nested helper is passed, not called', function (assert) {
    const makeCallback = () => () => 'called!';
    const describeArg = (value) => typeof value;
    const Root = <template>{{describeArg (makeCallback)}}</template>;
    this.render(Root);
    assert.strictEqual(textOf(this.element), 'function');
  });

  test('a helper in a yield param gets Ember semantics and stays reactive', function (assert) {
    const wrap = (value, { left }) => `${left}${value}`;
    let root;
    const Box = <template><p>{{yield (wrap @v left="<")}}</p></template>;
    class Root extends Component {
      @tracked v = 1;
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template><Box @v={{this.v}} as |shown|>{{shown}}</Box></template>
    }
    this.render(Root);
    assert.strictEqual(textOf(this.element), '<1');
    run(() => (root.v = 2));
    assert.strictEqual(textOf(this.element), '<2');
  });

  test('curried helper: (helper fn …) with later args (positional appended, named override)', function (assert) {
    const seen = [];
    const show = (...args) => {
      const named = typeof args[args.length - 1] === 'object' ? { ...args.pop() } : {};
      seen.push([args, named]);
      return `${args.join(',')}|${Object.keys(named)
        .sort()
        .map((k) => `${k}=${named[k]}`)
        .join(',')}`;
    };
    let root;
    class Root extends Component {
      @tracked x = 'x1';
      constructor(owner, args) {
        super(owner, args);
        root = this;
      }
      <template>
        {{#let (helper show 1 a="curried" b=this.x) as |H|}}
          <i>{{H 2 b="invocation"}}</i><b>{{H}}</b>
        {{/let}}
      </template>
    }
    this.render(Root);
    assert.strictEqual(
      htmlOf(this.element).replace(/\s+/g, ''),
      '<i>1,2|a=curried,b=invocation</i><b>1|a=curried,b=x1</b>'
    );
    run(() => (root.x = 'x2'));
    assert.strictEqual(this.element.querySelector('b').textContent, '1|a=curried,b=x2');
  });

  test('(element) passed as an argument renders its tag with the invocation\'s ...attributes', function (assert) {
    const Inner = <template>{{#let @tag as |Tag|}}<Tag id="content" ...attributes>{{yield}}</Tag>{{/let}}</template>;
    class Root extends Component {
      p = 'p';
      none = '';
      <template>
        <Inner @tag={{element this.p}} class="extra">Test</Inner>|<Inner @tag={{element this.none}} class="x">bare</Inner>
      </template>
    }
    this.render(Root);
    assert.strictEqual(
      htmlOf(this.element).trim(),
      '<p id="content" class="extra">Test</p>|bare',
      '"" renders the block without an element'
    );
  });
});
