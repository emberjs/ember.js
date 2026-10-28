// gxt NATIVE layer: components rendered by gxt through the native component
// manager (native/managers.ts) — template-only, @glimmer/component classes,
// args, blocks, `...attributes`, control flow, per-invocation instances.
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';
import { set } from '@ember/object';
import Service, { service } from '@ember/service';
import { run } from '@ember/runloop';
import { setupNativeRendering, textOf, htmlOf } from './-helpers';

const { module, test } = QUnit;

module('gxt-native | components', function (hooks) {
  setupNativeRendering(hooks);

  test('template-only component (gxt template function) renders with @args', function (assert) {
    const Greeting = <template><p class="greeting">Hello, {{@name}}!</p></template>;
    const Root = <template><Greeting @name="world" /></template>;
    this.render(Root);
    assert.strictEqual(htmlOf(this.element), '<p class="greeting">Hello, world!</p>');
  });

  test('templateOnly() + setComponentTemplate definition renders', function (assert) {
    const Badge = setComponentTemplate(<template><b>{{@label}}</b></template>, templateOnly());
    const Root = <template><Badge @label="new" /></template>;
    this.render(Root);
    assert.strictEqual(htmlOf(this.element), '<b>new</b>');
  });

  test('a templateOnly() definition without a template yields its block', function (assert) {
    const Bare = templateOnly();
    const Root = <template>
      <Bare><i>block</i></Bare>|{{#let (component Bare) as |B|}}<B>curried</B>{{/let}}
    </template>;
    this.render(Root);
    assert.strictEqual(textOf(this.element), 'block|curried');
    assert.strictEqual(this.element.querySelector('i')?.textContent, 'block');
  });

  test('a component class without a template yields its block', function (assert) {
    class Bare extends Component {}
    const Root = <template><Bare>block {{1}}</Bare></template>;
    this.render(Root);
    assert.strictEqual(textOf(this.element), 'block 1');
  });

  test('a component class with setComponentTemplate (no class-body template)', function (assert) {
    class Shout extends Component {
      get loud() {
        return String(this.args.word).toUpperCase();
      }
    }
    setComponentTemplate(<template><em>{{this.loud}}</em></template>, Shout);
    const Root = <template><Shout @word="hey" /></template>;
    this.render(Root);
    assert.strictEqual(htmlOf(this.element), '<em>HEY</em>');
  });

  test('@glimmer/component class: @tracked update re-renders after the run loop', function (assert) {
    let instance;
    class Counter extends Component {
      @tracked count = 0;
      constructor(owner, args) {
        super(owner, args);
        instance = this;
      }
      <template><span>{{this.count}}</span></template>
    }
    this.render(Counter);
    assert.strictEqual(textOf(this.element), '0');
    run(() => instance.count++);
    assert.strictEqual(textOf(this.element), '1');
    run(() => (instance.count = 5));
    assert.strictEqual(textOf(this.element), '5');
  });

  test('@tracked same-value write invalidates (getter re-evaluated, DOM unchanged)', function (assert) {
    let instance;
    let evaluations = 0;
    class Probe extends Component {
      @tracked value = 'a';
      constructor(owner, args) {
        super(owner, args);
        instance = this;
      }
      get shown() {
        evaluations++;
        return this.value;
      }
      <template>{{this.shown}}</template>
    }
    this.render(Probe);
    const before = evaluations;
    assert.strictEqual(textOf(this.element), 'a');
    run(() => (instance.value = instance.value));
    assert.ok(evaluations > before, 'the consuming getter re-ran after a same-value write');
    assert.strictEqual(textOf(this.element), 'a');
  });

  test('args: this.args and @arg update when the parent state changes', function (assert) {
    let parent;
    let childArgsSeen = [];
    class Child extends Component {
      get doubled() {
        childArgsSeen.push(this.args.value);
        return this.args.value * 2;
      }
      <template><i>{{@value}}</i>|<u>{{this.doubled}}</u></template>
    }
    class Parent extends Component {
      @tracked value = 1;
      constructor(owner, args) {
        super(owner, args);
        parent = this;
      }
      <template><Child @value={{this.value}} /></template>
    }
    this.render(Parent);
    assert.strictEqual(htmlOf(this.element), '<i>1</i>|<u>2</u>');
    run(() => (parent.value = 21));
    assert.strictEqual(htmlOf(this.element), '<i>21</i>|<u>42</u>');
    // gxt reads a binding twice on CREATE (its load-bearing const-check +
    // opcode read), so the getter may run twice for the initial value; the
    // update re-evaluates it exactly once.
    assert.deepEqual([...new Set(childArgsSeen)], [1, 21]);
    assert.strictEqual(childArgsSeen.filter((v) => v === 21).length, 1);
  });

  test('renderComponent args object (trackedObject-style @tracked holder) is reactive', function (assert) {
    class Args {
      @tracked name = 'one';
    }
    const args = new Args();
    const Show = <template><b>{{@name}}</b></template>;
    this.render(Show, args);
    assert.strictEqual(htmlOf(this.element), '<b>one</b>');
    run(() => (args.name = 'two'));
    assert.strictEqual(htmlOf(this.element), '<b>two</b>');
  });

  test('yield with block params', function (assert) {
    class Provider extends Component {
      label = 'from-provider';
      <template>[{{yield this.label 7}}]</template>
    }
    const Root = <template><Provider as |label n|>{{label}}:{{n}}</Provider></template>;
    this.render(Root);
    assert.strictEqual(textOf(this.element), '[from-provider:7]');
  });

  test('named blocks + has-block', function (assert) {
    const Card = <template>
      <header>{{#if (has-block "title")}}{{yield to="title"}}{{else}}untitled{{/if}}</header>
      <main>{{yield}}</main>
    </template>;
    const Root = <template>
      <Card><:title>T</:title><:default>body</:default></Card>
      <Card>only-body</Card>
    </template>;
    this.render(Root);
    const headers = [...this.element.querySelectorAll('header')].map((e) => textOf(e));
    const mains = [...this.element.querySelectorAll('main')].map((e) => textOf(e));
    assert.deepEqual(headers, ['T', 'untitled']);
    assert.deepEqual(mains, ['body', 'only-body']);
  });

  test('...attributes forwards attributes (class component and template-only)', function (assert) {
    class Box extends Component {
      <template><div class="box" ...attributes>{{yield}}</div></template>
    }
    const Pill = <template><span class="pill" ...attributes></span></template>;
    const Root = <template><Box data-test="b" title="t">x</Box><Pill data-k="1" /></template>;
    this.render(Root);
    const box = this.element.querySelector('.box');
    assert.strictEqual(box.getAttribute('data-test'), 'b');
    assert.strictEqual(box.getAttribute('title'), 't');
    assert.strictEqual(this.element.querySelector('.pill').getAttribute('data-k'), '1');
  });

  test('each / if / let inside a component', function (assert) {
    let instance;
    class List extends Component {
      @tracked items = ['a', 'b'];
      @tracked show = true;
      constructor(owner, args) {
        super(owner, args);
        instance = this;
      }
      <template>
        {{#if this.show}}<ul>{{#each this.items as |item i|}}<li>{{i}}:{{item}}</li>{{/each}}</ul>{{else}}hidden{{/if}}
        {{#let "L" as |prefix|}}<p>{{prefix}}{{this.items.length}}</p>{{/let}}
      </template>
    }
    this.render(List);
    assert.strictEqual(htmlOf(this.element.querySelector('ul')), '<li>0:a</li><li>1:b</li>');
    assert.strictEqual(textOf(this.element.querySelector('p')), 'L2');
    run(() => (instance.items = ['c', 'a', 'b']));
    assert.strictEqual(htmlOf(this.element.querySelector('ul')), '<li>0:c</li><li>1:a</li><li>2:b</li>');
    assert.strictEqual(textOf(this.element.querySelector('p')), 'L3');
    run(() => (instance.show = false));
    assert.strictEqual(this.element.querySelector('ul'), null);
    assert.ok(textOf(this.element).startsWith('hidden'));
  });

  test('{{#if}} uses Ember truthiness (empty array is falsy)', function (assert) {
    const Root = <template>{{#if @list}}yes{{else}}no{{/if}}</template>;
    this.render(Root, { list: [] });
    assert.strictEqual(textOf(this.element), 'no');
  });

  test('each rows: Ember @tracked row objects are not shadowed and update', function (assert) {
    class Row {
      @tracked label;
      constructor(label) {
        this.label = label;
      }
    }
    const rows = [new Row('x'), new Row('y')];
    const Root = <template><ol>{{#each @rows as |row|}}<li>{{row.label}}</li>{{/each}}</ol></template>;
    this.render(Root, { rows });
    assert.strictEqual(htmlOf(this.element.querySelector('ol')), '<li>x</li><li>y</li>');
    assert.notOk(
      Object.prototype.hasOwnProperty.call(rows[0], 'label'),
      'the row tap defined no own accessor over the @tracked prototype accessor'
    );
    run(() => (rows[1].label = 'z'));
    assert.strictEqual(htmlOf(this.element.querySelector('ol')), '<li>x</li><li>z</li>');
  });

  test('each rows: a POJO row re-renders through set() (tag consumed by the row tap)', function (assert) {
    const rows = [{ label: 'p' }];
    const Root = <template><ol>{{#each @rows as |row|}}<li>{{row.label}}</li>{{/each}}</ol></template>;
    this.render(Root, { rows });
    assert.strictEqual(htmlOf(this.element.querySelector('ol')), '<li>p</li>');
    run(() => set(rows[0], 'label', 'q'));
    assert.strictEqual(htmlOf(this.element.querySelector('ol')), '<li>q</li>');
    const desc = Object.getOwnPropertyDescriptor(rows[0], 'label');
    assert.ok(desc && 'value' in desc, 'the POJO row kept a data property');
  });

  test('the same component rendered twice gets distinct instances', function (assert) {
    const instances = [];
    class Tally extends Component {
      @tracked n = 0;
      constructor(owner, args) {
        super(owner, args);
        instances.push(this);
      }
      <template><span class="tally">{{@tag}}{{this.n}}</span></template>
    }
    const Root = <template><Tally @tag="a" /><Tally @tag="b" /></template>;
    this.render(Root);
    assert.strictEqual(instances.length, 2);
    assert.notStrictEqual(instances[0], instances[1]);
    const read = () => [...this.element.querySelectorAll('.tally')].map((e) => e.textContent);
    assert.deepEqual(read(), ['a0', 'b0']);
    run(() => (instances[1].n = 9));
    assert.deepEqual(read(), ['a0', 'b9'], 'state is per instance');
  });

  test('the owner reaches components (services via @service)', function (assert) {
    class Store extends Service {
      @tracked value = 'v1';
    }
    this.owner.register('service:store', Store);
    class Reader extends Component {
      @service store;
      <template>{{this.store.value}}</template>
    }
    this.render(Reader);
    assert.strictEqual(textOf(this.element), 'v1');
    run(() => (this.owner.lookup('service:store').value = 'v2'));
    assert.strictEqual(textOf(this.element), 'v2');
  });

  // Ported from the classic `AngleBracket Invocation :: has-block` (native-
  // skipped there: its component is a classic @ember/component). Glimmer gives
  // `<X></X>` an empty default block and `<X />` none.
  test('has-block: <X></X> has an empty default block, <X /> has none', function (assert) {
    const CheckBlock = <template>{{#if (has-block)}}Yes{{else}}No{{/if}}</template>;
    const Root = <template>
      <p><CheckBlock /></p><p><CheckBlock></CheckBlock></p><p><CheckBlock>x</CheckBlock></p>
    </template>;
    this.render(Root);
    const read = () => [...this.element.querySelectorAll('p')].map(textOf);
    assert.deepEqual(read(), ['No', 'Yes', 'Yes']);
  });

  test('an empty <X></X> passes only the named arguments it is given', function (assert) {
    const keys = [];
    class Probe extends Component {
      constructor(owner, args) {
        super(owner, args);
        keys.push(Object.keys(this.args).join(','));
      }
      <template><i>{{@a}}</i></template>
    }
    const Root = <template>
      <Probe @a="1"></Probe><Probe></Probe><Probe @a="2" as |x|></Probe><Probe @a="3" />
    </template>;
    this.render(Root);
    assert.deepEqual(keys, ['a', '', 'a', 'a']);
  });

  test('an empty custom element <foo-bar></foo-bar> renders no extra attribute', function (assert) {
    const Root = <template><foo-bar></foo-bar><foo-bar data-x="1"></foo-bar></template>;
    this.render(Root);
    const names = [...this.element.querySelectorAll('foo-bar')].map((el) => el.getAttributeNames());
    assert.deepEqual(names, [[], ['data-x']]);
    assert.strictEqual(htmlOf(this.element), '<foo-bar></foo-bar><foo-bar data-x="1"></foo-bar>');
  });
});
