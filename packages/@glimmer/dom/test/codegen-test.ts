import { generateDOM } from '@glimmer/compiler';
import { preprocess } from '@glimmer/syntax';
import * as runtime from '@glimmer/dom';
import type { RenderResult } from '@glimmer/dom';
import { tracked } from '@glimmer/tracking';
import { trackedArray } from '@glimmer/validator';
import { componentCapabilities, setComponentManager, setModifierManager } from '@glimmer/manager';
import { capabilities as modifierCapabilities } from '@ember/modifier';
import * as emberHelper from '@ember/helper';
import * as emberModifier from '@ember/modifier';
import { htmlSafe } from '@ember/template';
import { template as vmTemplate } from '@ember/template-compiler/runtime';
import { run } from '@ember/runloop';

const { module, test } = QUnit;

const IMPORTS: Record<string, Record<string, unknown>> = {
  '@ember/helper': emberHelper,
  '@ember/modifier': emberModifier,
};

/**
 * Compile a template the way the babel plugin would, with `scope` as the
 * JavaScript bindings that are in scope for it.
 */
function compile(source: string, scope: Record<string, unknown> = {}): runtime.Template {
  let { hoisted, expression } = generateDOM(preprocess(source, { strictMode: true }), {
    isLexical: (name) => name in scope,
    importOf: (name) => {
      for (let [module, exports] of Object.entries(IMPORTS)) {
        if (name in exports && exports[name] === scope[name]) return { module, name };
      }
      return undefined;
    },
    runtime: (name) => `$rt.${name}`,
    importBinding: (m, name) => `$imports[${JSON.stringify(m)}][${JSON.stringify(name)}]`,
  });

  let names = Object.keys(scope);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- this is a compiler test
  let factory = new Function(
    '$rt',
    '$imports',
    ...names,
    `${hoisted.join('\n')}\nreturn ${expression};`
  );
  return factory(runtime, IMPORTS, ...names.map((n) => scope[n])) as runtime.Template;
}

let result: RenderResult | null = null;

function fixture(): HTMLElement {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- always exists
  return document.querySelector('#qunit-fixture')!;
}

function render(component: object, args?: Record<string, unknown>) {
  run(() => {
    result = runtime.renderComponent(
      component,
      args ? { into: fixture(), args } : { into: fixture() }
    );
  });
}

function html(): string {
  // strip the comments used as anchors
  return fixture().innerHTML.replace(/<!---->/gu, '');
}

function change(fn: () => void) {
  run(fn);
}

function settled() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * The same shape as `@glimmer/component` (which is not available to these tests).
 */
class Component<_S = unknown> {
  constructor(
    _owner: object,
    readonly args: Record<string, unknown>
  ) {}

  willDestroy() {}
}

setComponentManager(
  () => ({
    capabilities: componentCapabilities('3.13', { destructor: true }),
    createComponent: (
      Factory: new (owner: object, args: object) => Component,
      args: { named: object }
    ) => new Factory({}, args.named),
    getContext: (component: Component) => component,
    destroyComponent: (component: Component) => component.willDestroy(),
  }),
  Component
);

class State {
  @tracked name = 'world';
  @tracked show = true;
  @tracked count = 0;
}

module('@glimmer/dom | codegen', (hooks) => {
  hooks.afterEach(() => {
    if (result) run(() => result?.destroy());
    result = null;
  });

  test('static content', (assert) => {
    render(compile(`<p class="a">hello &amp; <b>bye</b></p>{{"!"}}`));
    assert.strictEqual(html(), '<p class="a">hello &amp; <b>bye</b></p>!');
  });

  test('dynamic text updates', (assert) => {
    let state = new State();
    render(compile(`<p>Hello {{state.name}}!</p>`, { state }));
    assert.strictEqual(html(), '<p>Hello world!</p>');

    change(() => (state.name = 'Ember'));
    assert.strictEqual(html(), '<p>Hello Ember!</p>');
  });

  test('args', (assert) => {
    let state = new State();
    render(compile(`{{@name}}`), {
      get name() {
        return state.name;
      },
    });
    assert.strictEqual(html(), 'world');

    change(() => (state.name = 'args'));
    assert.strictEqual(html(), 'args');
  });

  test('attributes', (assert) => {
    let state = new State();
    render(
      compile(
        `<div class="static {{if state.show 'shown'}}" title={{state.name}} data-count="{{state.count}} items"></div>`,
        { state }
      )
    );
    assert.strictEqual(
      html(),
      '<div class="static shown" title="world" data-count="0 items"></div>'
    );

    change(() => {
      state.show = false;
      state.count = 2;
      state.name = 'x';
    });
    // (the same as the VM: the concatenated value keeps its trailing space)
    assert.strictEqual(html(), '<div class="static " title="x" data-count="2 items"></div>');
  });

  test('if / else', (assert) => {
    let state = new State();
    render(
      compile(`{{#if state.show}}<b>yes {{state.name}}</b>{{else}}<i>no</i>{{/if}}`, { state })
    );
    assert.strictEqual(html(), '<b>yes world</b>');

    change(() => (state.name = 'there'));
    assert.strictEqual(html(), '<b>yes there</b>');

    change(() => (state.show = false));
    assert.strictEqual(html(), '<i>no</i>');

    change(() => (state.show = true));
    assert.strictEqual(html(), '<b>yes there</b>');
  });

  test('each: keyed updates, moves, and else', (assert) => {
    let a = { id: 'a', label: 'A' };
    let b = { id: 'b', label: 'B' };
    let c = { id: 'c', label: 'C' };
    let list = trackedArray([a, b, c]);

    render(
      compile(
        `<ul>{{#each list key="id" as |item i|}}<li>{{i}}:{{item.label}}</li>{{else}}<li>empty</li>{{/each}}</ul>`,
        { list }
      )
    );
    assert.strictEqual(html(), '<ul><li>0:A</li><li>1:B</li><li>2:C</li></ul>');

    let firstLi = fixture().querySelector('li');

    change(() => list.reverse());
    assert.strictEqual(html(), '<ul><li>0:C</li><li>1:B</li><li>2:A</li></ul>');
    assert.strictEqual(
      fixture().querySelectorAll('li')[2],
      firstLi,
      'the DOM for "A" was moved, not re-created'
    );

    change(() => list.splice(1, 1));
    assert.strictEqual(html(), '<ul><li>0:C</li><li>1:A</li></ul>');

    change(() => list.push({ id: 'd', label: 'D' }));
    assert.strictEqual(html(), '<ul><li>0:C</li><li>1:A</li><li>2:D</li></ul>');

    change(() => list.splice(0, list.length));
    assert.strictEqual(html(), '<ul><li>empty</li></ul>');
  });

  test('template-only components: args, yield, block params, named blocks', (assert) => {
    let Card = compile(
      `<section ...attributes><h1>{{yield to="title"}}</h1>{{#if (has-block "body")}}{{yield @count to="body"}}{{else}}no body{{/if}}</section>`
    );
    let state = new State();

    render(
      compile(
        `<Card class="card" @count={{state.count}}><:title>Hi {{state.name}}</:title><:body as |n|>count: {{n}}</:body></Card>`,
        { Card, state }
      )
    );
    assert.strictEqual(html(), '<section class="card"><h1>Hi world</h1>count: 0</section>');

    change(() => {
      state.count = 5;
      state.name = 'you';
    });
    assert.strictEqual(html(), '<section class="card"><h1>Hi you</h1>count: 5</section>');
  });

  test('...attributes merges classes, and ordering decides other attributes', (assert) => {
    let Inner = compile(`<div class="inner" title="before" ...attributes data-x="after"></div>`);
    render(compile(`<Inner class="outer" title="outer" data-x="outer" />`, { Inner }));
    assert.strictEqual(html(), '<div class="inner outer" title="outer" data-x="after"></div>');
  });

  test('glimmer components with tracked state, on, and fn', (assert) => {
    class Counter extends Component<{ Args: { step: number } }> {
      @tracked count = 0;
      increment = (by: number) => (this.count += by);
    }
    runtime.setTemplate(
      Counter,
      compile(`<button {{on "click" (fn this.increment @step)}}>{{this.count}}</button>`)
    );

    render(compile(`<Counter @step={{2}} />`, { Counter }));
    assert.strictEqual(html(), '<button>0</button>');

    let button = fixture().querySelector('button');
    change(() => button?.click());
    assert.strictEqual(html(), '<button>2</button>');
  });

  test('components are destroyed with their block', async (assert) => {
    let destroyed = 0;
    class Child extends Component {
      override willDestroy() {
        destroyed++;
      }
    }
    runtime.setTemplate(Child, compile(`<span>child</span>`));
    let state = new State();

    render(compile(`{{#if state.show}}<Child />{{/if}}`, { Child, state }));
    assert.strictEqual(html(), '<span>child</span>');

    change(() => (state.show = false));
    assert.strictEqual(html(), '');

    // destruction is scheduled
    await settled();
    assert.strictEqual(destroyed, 1);
  });

  test('helpers: functions, built-ins, and inline keywords', (assert) => {
    let shout = (text: string, { suffix }: { suffix?: string } = {}) =>
      `${text.toUpperCase()}${suffix ?? ''}`;
    let state = new State();

    render(
      compile(
        `{{shout state.name suffix="!"}} {{concat "a" state.count}} {{if (eq state.count 0) "zero" "more"}} {{get (hash a=(array 1 2)) "a.length"}} {{and state.show "yes"}} {{or false "fallback"}} {{not state.show}}`,
        { shout, state, concat: emberHelper.concat, get: emberHelper.get }
      )
    );
    assert.strictEqual(html(), 'WORLD! a0 zero 2 yes fallback false');

    change(() => (state.count = 3));
    assert.strictEqual(html(), 'WORLD! a3 more 2 yes fallback false');
  });

  test('a bare lexical helper is invoked', (assert) => {
    let now = () => 'called';
    render(compile(`{{now}}`, { now }));
    assert.strictEqual(html(), 'called');
  });

  test('custom modifiers install, update, and are destroyed', async (assert) => {
    let events: string[] = [];

    class Manager {
      capabilities = modifierCapabilities('3.22');
      createModifier() {
        return {};
      }
      installModifier(_state: object, element: Element, args: { positional: unknown[] }) {
        events.push(`install ${element.tagName} ${String(args.positional[0])}`);
      }
      updateModifier(_state: object, args: { positional: unknown[] }) {
        events.push(`update ${String(args.positional[0])}`);
      }
      destroyModifier() {
        events.push('destroy');
      }
    }
    let track = setModifierManager(() => new Manager() as never, {});
    let state = new State();

    render(compile(`{{#if state.show}}<p {{track state.count}}></p>{{/if}}`, { track, state }));
    assert.deepEqual(events, ['install P 0']);

    change(() => (state.count = 1));
    assert.deepEqual(events, ['install P 0', 'update 1']);

    change(() => (state.show = false));
    await settled();
    assert.deepEqual(events, ['install P 0', 'update 1', 'destroy']);
  });

  test('let, each-in, and trusted content', (assert) => {
    let obj = { a: 1, b: 2 };
    render(
      compile(
        `{{#let "x" (concat "y" "z") as |x yz|}}{{x}}{{yz}}{{/let}}|{{#each-in obj as |k v|}}{{k}}={{v}};{{/each-in}}|{{{markup}}}|{{safe}}`,
        { obj, markup: '<i>raw</i>', safe: htmlSafe('<b>safe</b>'), concat: emberHelper.concat }
      )
    );
    assert.strictEqual(html(), 'xyz|a=1;b=2;|<i>raw</i>|<b>safe</b>');
  });

  test('dynamic content can switch between text and components', (assert) => {
    let Bold = compile(`<b>bold</b>`);
    let state = new State();
    let value = {
      get current(): unknown {
        return state.show ? Bold : 'plain';
      },
    };

    render(compile(`[{{value.current}}]`, { value }));
    assert.strictEqual(html(), '[<b>bold</b>]');

    change(() => (state.show = false));
    assert.strictEqual(html(), '[plain]');

    change(() => (state.show = true));
    assert.strictEqual(html(), '[<b>bold</b>]');
  });

  test('components without a compiled template are rendered by the VM', (assert) => {
    let VM = vmTemplate(`<p>vm: {{@name}}</p>`);
    let state = new State();

    render(compile(`<VM @name={{state.name}} />`, { VM, state }));
    assert.strictEqual(
      html(),
      '<glimmer-island style="display: contents;"><p>vm: world</p></glimmer-island>'
    );

    change(() => (state.name = 'reactive'));
    assert.strictEqual(
      html(),
      '<glimmer-island style="display: contents;"><p>vm: reactive</p></glimmer-island>'
    );
  });

  test('strict mode: unknown names are a compile error', (assert) => {
    assert.throws(() => compile(`{{nope}}`), /`nope`, but it is not in scope/u);
  });
});
