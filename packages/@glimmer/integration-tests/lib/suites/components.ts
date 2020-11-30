import { Dict, Owner } from '@glimmer/interfaces';
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
import { GlimmerishComponent } from '../components';
import { strip, stripTight } from '../test-helpers/strings';
import { tracked } from '../test-helpers/tracked';
import { assertElement } from '../dom/simple-utils';
import { assertElementShape } from '../dom/assertions';

export class TemplateOnlyComponents extends RenderTest {
  static suiteName = 'TemplateOnly';

  @test({
    kind: 'templateOnly',
  })
  'creating a new component'() {
    this.render(
      {
        name: 'MyComponent',
        layout: '{{yield}} - {{@color}}',
        template: 'hello!',
        args: { color: 'color' },
      },
      { color: 'red' }
    );

    this.assertHTML(`hello! - red`);
    this.assertStableRerender();

    this.rerender({ color: 'green' });
    this.assertHTML(`hello! - green`);
    this.assertStableNodes();

    this.rerender({ color: 'red' });
    this.assertHTML(`hello! - red`);
    this.assertStableNodes();
  }

  @test({
    kind: 'templateOnly',
  })
  'inner ...attributes'() {
    this.render(
      {
        name: 'MyComponent',
        layout: '<div><span ...attributes>{{yield}} - {{@color}}</span></div>',
        template: 'hello!',
        args: { color: 'color' },
        attributes: { color: '{{color}}' },
      },
      { color: 'red' }
    );

    this.assertHTML(`<div><span color='red'>hello! - red</span></div>`);
    this.assertStableRerender();

    this.rerender({ color: 'green' });
    this.assertHTML(`<div><span color='green'>hello! - green</span></div>`);
    this.assertStableNodes();

    this.rerender({ color: 'red' });
    this.assertHTML(`<div><span color='red'>hello! - red</span></div>`);
    this.assertStableNodes();
  }
}

export class GlimmerishComponents extends RenderTest {
  static suiteName = 'Glimmerish';

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (named arg) via angle brackets'() {
    this.registerComponent('Glimmer', 'Foo', 'hello world!');
    this.render({
      layout: '<@foo />',
      args: {
        foo: 'component "Foo"',
      },
    });

    this.assertHTML(`<div>hello world!</div>`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (named arg path) via angle brackets'() {
    this.registerHelper('hash', (_positional, named) => named);
    this.registerComponent('Glimmer', 'Foo', 'hello world!');
    this.render({
      layout: '<@stuff.Foo />',
      args: {
        stuff: 'hash Foo=(component "Foo")',
      },
    });

    this.assertHTML(`<div>hello world!</div>`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking curried component with attributes via angle brackets (invocation attributes clobber)'() {
    this.registerHelper('hash', (_positional, named) => named);
    this.registerComponent(
      'Glimmer',
      'Foo',
      '<p data-foo="default" ...attributes>hello world!</p>'
    );
    this.render({
      layout: '<@stuff.Foo data-foo="invocation" />',
      args: {
        stuff: 'hash Foo=(component "Foo")',
      },
    });

    this.assertHTML(`<div><p data-foo="invocation">hello world!</p></div>`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking curried component with attributes via angle brackets (invocation classes merge)'() {
    this.registerHelper('hash', (_positional, named) => named);
    this.registerComponent('Glimmer', 'Foo', '<p class="default" ...attributes>hello world!</p>');
    this.render({
      layout: '<@stuff.Foo class="invocation" />',
      args: {
        stuff: 'hash Foo=(component "Foo")',
      },
    });

    this.assertHTML(`<div><p class="default invocation">hello world!</p></div>`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (named arg) via angle brackets supports attributes (invocation attributes clobber)'() {
    this.registerComponent(
      'Glimmer',
      'Foo',
      '<div data-test="default" ...attributes>hello world!</div>'
    );
    this.render({
      layout: '<@foo data-test="foo"/>',
      args: {
        foo: 'component "Foo"',
      },
    });

    this.assertHTML(`<div><div data-test="foo">hello world!</div></div>`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (named arg) via angle brackets supports attributes'() {
    this.registerComponent('Glimmer', 'Foo', '<div ...attributes>hello world!</div>');
    this.render({
      layout: '<@foo data-test="foo"/>',
      args: {
        foo: 'component "Foo"',
      },
    });

    this.assertHTML(`<div><div data-test="foo">hello world!</div></div>`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (named arg) via angle brackets supports args'() {
    this.registerComponent('Glimmer', 'Foo', 'hello {{@name}}!');
    this.render({
      layout: '<@foo @name="world" />',
      args: {
        foo: 'component "Foo"',
      },
    });

    this.assertHTML(`<div>hello world!</div>`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (named arg) via angle brackets supports passing a block'() {
    this.registerComponent('Glimmer', 'Foo', 'hello {{yield}}!');
    this.render({
      layout: '<@foo>world</@foo>',
      args: {
        foo: 'component "Foo"',
      },
    });

    this.assertHTML(`<div>hello world!</div>`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (named arg) via angle brackets supports args and attributes'() {
    let instance: Foo;
    class Foo extends GlimmerishComponent {
      @tracked localProperty: string;

      constructor(owner: Owner, args: Dict) {
        super(owner, args);
        instance = this;
        this.localProperty = 'local';
      }
    }
    this.registerComponent(
      'Glimmer',
      'Foo',
      '<div ...attributes>[{{localProperty}} {{@staticNamedArg}} {{@dynamicNamedArg}}]</div>',
      Foo
    );

    this.render(
      {
        layout: stripTight`<@foo @staticNamedArg="static" data-test1={{@outerArg}} data-test2="static" @dynamicNamedArg={{@outerArg}} />`,
        args: {
          foo: 'component "Foo"',
          outerArg: 'outer',
        },
      },
      { outer: 'outer' }
    );

    this.assertHTML(
      `<div><div data-test1="outer" data-test2="static">[local static outer]</div></div>`
    );
    this.assertStableRerender();

    this.rerender({ outer: 'OUTER' });
    this.assertHTML(
      `<div><div data-test1="OUTER" data-test2="static">[local static OUTER]</div></div>`
    );

    instance!.localProperty = 'LOCAL';
    this.rerender();
    this.assertHTML(
      `<div><div data-test1="OUTER" data-test2="static">[LOCAL static OUTER]</div></div>`
    );

    instance!.localProperty = 'local';
    this.rerender({ outer: 'outer' });
    this.assertHTML(
      `<div><div data-test1="outer" data-test2="static">[local static outer]</div></div>`
    );
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (local) via angle brackets'() {
    this.registerComponent('Glimmer', 'Foo', 'hello world!');
    this.render(`{{#with (component 'Foo') as |Other|}}<Other />{{/with}}`);

    this.assertHTML(`hello world!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (local path) via angle brackets'() {
    this.registerHelper('hash', (_positional, named) => named);
    this.registerComponent('Glimmer', 'Foo', 'hello world!');
    this.render(`{{#with (hash Foo=(component 'Foo')) as |Other|}}<Other.Foo />{{/with}}`);

    this.assertHTML(`hello world!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (local) via angle brackets (ill-advised "htmlish element name" but supported)'() {
    this.registerComponent('Glimmer', 'Foo', 'hello world!');
    this.render(`{{#with (component 'Foo') as |div|}}<div />{{/with}}`);

    this.assertHTML(`hello world!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (local) via angle brackets supports attributes'() {
    this.registerComponent('Glimmer', 'Foo', '<div ...attributes>hello world!</div>');
    this.render(`{{#with (component 'Foo') as |Other|}}<Other data-test="foo" />{{/with}}`);

    this.assertHTML(`<div data-test="foo">hello world!</div>`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (local) via angle brackets supports args'() {
    this.registerComponent('Glimmer', 'Foo', 'hello {{@name}}!');
    this.render(`{{#with (component 'Foo') as |Other|}}<Other @name="world" />{{/with}}`);

    this.assertHTML(`hello world!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (local) via angle brackets supports passing a block'() {
    this.registerComponent('Glimmer', 'Foo', 'hello {{yield}}!');
    this.render(`{{#with (component 'Foo') as |Other|}}<Other>world</Other>{{/with}}`);

    this.assertHTML(`hello world!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (local) via angle brackets supports args, attributes, and blocks'() {
    let instance: Foo;
    class Foo extends GlimmerishComponent {
      @tracked localProperty: string;

      constructor(owner: Owner, args: Dict) {
        super(owner, args);
        instance = this;
        this.localProperty = 'local';
      }
    }
    this.registerComponent(
      'Glimmer',
      'Foo',
      '<div ...attributes>[{{localProperty}} {{@staticNamedArg}} {{@dynamicNamedArg}}] - {{yield}}</div>',
      Foo
    );
    this.render(
      `{{#with (component 'Foo') as |Other|}}<Other @staticNamedArg="static" data-test1={{outer}} data-test2="static" @dynamicNamedArg={{outer}}>template</Other>{{/with}}`,
      { outer: 'outer' }
    );

    this.assertHTML(
      `<div data-test1="outer" data-test2="static">[local static outer] - template</div>`
    );
    this.assertStableRerender();

    this.rerender({ outer: 'OUTER' });
    this.assertHTML(
      `<div data-test1="OUTER" data-test2="static">[local static OUTER] - template</div>`
    );

    instance!.localProperty = 'LOCAL';
    this.rerender();
    this.assertHTML(
      `<div data-test1="OUTER" data-test2="static">[LOCAL static OUTER] - template</div>`
    );

    instance!.localProperty = 'local';
    this.rerender({ outer: 'outer' });
    this.assertHTML(
      `<div data-test1="outer" data-test2="static">[local static outer] - template</div>`
    );
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (path) via angle brackets'() {
    this.registerComponent('Glimmer', 'TestHarness', '<this.args.Foo />');
    this.registerComponent('Glimmer', 'Foo', 'hello world!');

    this.render('<TestHarness @Foo={{component "Foo"}} />');

    this.assertHTML(`hello world!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (path) via angle brackets does not work for string'() {
    this.registerComponent('Glimmer', 'TestHarness', '<this.args.Foo />');
    this.registerComponent('Glimmer', 'Foo', 'hello world!');

    this.assert.throws(() => {
      this.render('<TestHarness @Foo="Foo" />');
    }, /Expected a curried component definition, but received Foo. You may have accidentally done <this.args.Foo>, where \"this.args.Foo\"/);
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (path) via angle brackets with named block'() {
    this.registerComponent(
      'Glimmer',
      'TestHarness',
      '<this.args.Foo><:bar>Stuff!</:bar></this.args.Foo>'
    );
    this.registerComponent('Glimmer', 'Foo', '{{yield to="bar"}}');

    this.render('<TestHarness @Foo={{component "Foo"}} />');

    this.assertHTML(`Stuff!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (path) via angle brackets does not support implicit `this` fallback'() {
    this.assert.throws(() => {
      this.registerComponent('TemplateOnly', 'Test', '<stuff.Foo />');
    }, /stuff is not in scope/);
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (path) via angle brackets supports attributes'() {
    class TestHarness extends GlimmerishComponent {
      public Foo: any;

      constructor(owner: Owner, args: Dict) {
        super(owner, args);
        this.Foo = args.Foo;
      }
    }
    this.registerComponent('Glimmer', 'TestHarness', '<this.Foo data-test="foo"/>', TestHarness);
    this.registerComponent('Glimmer', 'Foo', '<div ...attributes>hello world!</div>');
    this.render('<TestHarness @Foo={{component "Foo"}} />');

    this.assertHTML(`<div data-test="foo">hello world!</div>`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (path) via angle brackets supports args'() {
    class TestHarness extends GlimmerishComponent {
      public Foo: any;

      constructor(owner: Owner, args: Dict) {
        super(owner, args);
        this.Foo = args.Foo;
      }
    }
    this.registerComponent('Glimmer', 'TestHarness', '<this.Foo @name="world"/>', TestHarness);
    this.registerComponent('Glimmer', 'Foo', 'hello {{@name}}!');
    this.render('<TestHarness @Foo={{component "Foo"}} />');

    this.assertHTML(`hello world!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (path) via angle brackets supports passing a block'() {
    class TestHarness extends GlimmerishComponent {
      public Foo: any;

      constructor(owner: Owner, args: Dict) {
        super(owner, args);
        this.Foo = args.Foo;
      }
    }
    this.registerComponent('Glimmer', 'TestHarness', '<this.Foo>world</this.Foo>', TestHarness);
    this.registerComponent('Glimmer', 'Foo', 'hello {{yield}}!');
    this.render('<TestHarness @Foo={{component "Foo"}} />');

    this.assertHTML(`hello world!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (path) via angle brackets supports args, attributes, and blocks'() {
    let instance: Foo;
    class TestHarness extends GlimmerishComponent {
      public Foo: any;

      constructor(owner: Owner, args: Dict) {
        super(owner, args);
        this.Foo = args.Foo;
      }
    }

    class Foo extends GlimmerishComponent {
      @tracked localProperty: string;

      constructor(owner: Owner, args: Dict) {
        super(owner, args);
        instance = this;
        this.localProperty = 'local';
      }
    }
    this.registerComponent(
      'Glimmer',
      'TestHarness',
      '<this.Foo @staticNamedArg="static" data-test1={{@outer}} data-test2="static" @dynamicNamedArg={{@outer}}>template</this.Foo>',
      TestHarness
    );
    this.registerComponent(
      'Glimmer',
      'Foo',
      '<div ...attributes>[{{localProperty}} {{@staticNamedArg}} {{@dynamicNamedArg}}] - {{yield}}</div>',
      Foo
    );
    this.render('<TestHarness @outer={{outer}} @Foo={{component "Foo"}} />', { outer: 'outer' });

    this.assertHTML(
      `<div data-test1="outer" data-test2="static">[local static outer] - template</div>`
    );
    this.assertStableRerender();

    this.rerender({ outer: 'OUTER' });
    this.assertHTML(
      `<div data-test1="OUTER" data-test2="static">[local static OUTER] - template</div>`
    );

    instance!.localProperty = 'LOCAL';
    this.rerender();
    this.assertHTML(
      `<div data-test1="OUTER" data-test2="static">[LOCAL static OUTER] - template</div>`
    );

    instance!.localProperty = 'local';
    this.rerender({ outer: 'outer' });
    this.assertHTML(
      `<div data-test1="outer" data-test2="static">[local static outer] - template</div>`
    );
  }

  @test({ kind: 'glimmer' })
  'angle bracket invocation can pass forward ...attributes to a nested component'() {
    this.registerComponent('Glimmer', 'Qux', '<div data-from-qux ...attributes></div>');
    this.registerComponent('Glimmer', 'Bar', '<Qux data-from-bar ...attributes />');
    this.registerComponent('Glimmer', 'Foo', '<Bar data-from-foo ...attributes />');

    this.render('<Foo data-from-top />');
    this.assertHTML('<div data-from-qux data-from-bar data-from-foo data-from-top></div>');
  }

  @test({ kind: 'glimmer' })
  'angle bracket invocation can allow invocation side to override attributes with ...attributes'() {
    this.registerComponent('Glimmer', 'Qux', '<div id="qux" ...attributes />');
    this.registerComponent('Glimmer', 'Bar', '<Qux id="bar" ...attributes />');
    this.registerComponent('Glimmer', 'Foo', '<Bar id="foo" ...attributes />');

    this.render('<Foo id="top" />');
    this.assertHTML('<div id="top"></div>');
  }

  @test({ kind: 'glimmer' })
  'angle bracket invocation can allow invocation side to override the type attribute with ...attributes'() {
    this.registerComponent('Glimmer', 'Qux', '<div type="qux" ...attributes />');
    this.registerComponent('Glimmer', 'Bar', '<Qux type="bar" ...attributes />');
    this.registerComponent('Glimmer', 'Foo', '<Bar type="foo" ...attributes />');

    this.render('<Foo type="top" />');
    this.assertHTML('<div type="top"></div>');
  }

  @test({ kind: 'glimmer' })
  'angle bracket invocation can override invocation side attributes with ...attributes'() {
    this.registerComponent('Glimmer', 'Qux', '<div ...attributes id="qux" />');
    this.registerComponent('Glimmer', 'Bar', '<Qux ...attributes id="bar" />');
    this.registerComponent('Glimmer', 'Foo', '<Bar ...attributes id="foo" />');

    this.render('<Foo id="top" />');
    this.assertHTML('<div id="qux"></div>');
  }

  @test({ kind: 'glimmer' })
  'angle bracket invocation can override invocation side type attribute with ...attributes'() {
    this.registerComponent('Glimmer', 'Qux', '<div ...attributes type="qux" />');
    this.registerComponent('Glimmer', 'Bar', '<Qux ...attributes type="bar" />');
    this.registerComponent('Glimmer', 'Foo', '<Bar ...attributes type="foo" />');

    this.render('<Foo type="top" />');
    this.assertHTML('<div type="qux"></div>');
  }

  @test({ kind: 'glimmer' })
  'angle bracket invocation can forward classes before ...attributes to a nested component'() {
    this.registerComponent('Glimmer', 'Qux', '<div class="qux" ...attributes />');
    this.registerComponent('Glimmer', 'Bar', '<Qux class="bar" ...attributes />');
    this.registerComponent('Glimmer', 'Foo', '<Bar class="foo" ...attributes />');

    this.render('<Foo class="top" />');
    this.assertHTML('<div class="qux bar foo top"></div>');
  }

  @test({ kind: 'glimmer' })
  'angle bracket invocation can forward classes after ...attributes to a nested component'() {
    this.registerComponent('Glimmer', 'Qux', '<div ...attributes class="qux" />');
    this.registerComponent('Glimmer', 'Bar', '<Qux ...attributes class="bar" />');
    this.registerComponent('Glimmer', 'Foo', '<Bar ...attributes class="foo" />');

    this.render('<Foo class="top" />');
    this.assertHTML('<div class="top foo bar qux"></div>');
  }

  @test({ kind: 'glimmer' })
  '[BUG: #644 popping args should be balanced]'() {
    class MainComponent extends GlimmerishComponent {
      salutation = 'Glimmer';
    }
    this.registerComponent(
      'Glimmer',
      'Main',
      '<div><HelloWorld @name={{salutation}} /></div>',
      MainComponent
    );
    this.registerComponent('Glimmer', 'HelloWorld', '<h1>Hello {{@name}}!</h1>');
    this.render('<Main />');
    this.assertHTML('<div><h1>Hello Glimmer!</h1></div>');
  }

  @test({ kind: 'glimmer' })
  'Only one arg reference is created per argument'() {
    let count = 0;

    this.registerHelper('count', () => count++);

    class MainComponent extends GlimmerishComponent {
      salutation = 'Glimmer';
    }
    this.registerComponent(
      'Glimmer',
      'Main',
      '<div><Child @value={{count}} /></div>',
      MainComponent
    );
    this.registerComponent('Glimmer', 'Child', '{{@value}} {{this.args.value}}');
    this.render('<Main />');
    this.assertHTML('<div>0 0</div>');
  }

  @test({ kind: 'glimmer' })
  '[BUG] Gracefully handles application of curried args when invoke starts with 0 args'() {
    class MainComponent extends GlimmerishComponent {
      salutation = 'Glimmer';
    }
    this.registerComponent(
      'Glimmer',
      'Main',
      '<div><HelloWorld @a={{@a}} as |wat|>{{wat}}</HelloWorld></div>',
      MainComponent
    );
    this.registerComponent('Glimmer', 'HelloWorld', '{{yield (component "A" a=@a)}}');
    this.registerComponent('Glimmer', 'A', 'A {{@a}}');
    this.render('<Main @a={{a}} />', { a: 'a' });
    this.assertHTML('<div>A a</div>');
    this.assertStableRerender();
    this.rerender({ a: 'A' });
    this.assertHTML('<div>A A</div>');
    this.assertStableNodes();
  }

  @test({ kind: 'glimmer' })
  'Static block component helper'() {
    this.registerComponent(
      'Glimmer',
      'A',
      'A {{#component "B" arg1=@one arg2=@two arg3=@three}}{{/component}}'
    );
    this.registerComponent('Glimmer', 'B', 'B {{@arg1}} {{@arg2}} {{@arg3}}');
    this.render('<A @one={{first}} @two={{second}} @three={{third}} />', {
      first: 1,
      second: 2,
      third: 3,
    });
    this.assertHTML('A B 1 2 3');
    this.assertStableRerender();
    this.rerender({ first: 2, second: 3, third: 4 });
    this.assertHTML('A B 2 3 4');
    this.assertStableNodes();
  }

  @test({ kind: 'glimmer' })
  'Static inline component helper'() {
    this.registerComponent('Glimmer', 'A', 'A {{component "B" arg1=@one arg2=@two arg3=@three}}');
    this.registerComponent('Glimmer', 'B', 'B {{@arg1}} {{@arg2}} {{@arg3}}');
    this.render('<A @one={{first}} @two={{second}} @three={{third}} />', {
      first: 1,
      second: 2,
      third: 3,
    });
    this.assertHTML('A B 1 2 3');
    this.assertStableRerender();
    this.rerender({ first: 2, second: 3, third: 4 });
    this.assertHTML('A B 2 3 4');
    this.assertStableNodes();
  }

  @test({ kind: 'glimmer' })
  'top level in-element'() {
    this.registerComponent('Glimmer', 'Foo', '<Bar data-bar={{@childName}} @data={{@data}} />');
    this.registerComponent('Glimmer', 'Bar', '<div ...attributes>Hello World</div>');

    let el = this.delegate.getInitialElement();

    this.render(
      strip`
    {{#each components key="id" as |c|}}
      {{#in-element c.mount}}
        {{component c.name childName=c.child data=c.data}}
      {{/in-element}}
    {{/each}}
    `,
      { components: [{ name: 'Foo', child: 'Bar', mount: el, data: { wat: 'Wat' } }] }
    );

    let first = assertElement(el.firstChild);

    assertElementShape(first, 'div', { 'data-bar': 'Bar' }, 'Hello World');
    this.rerender({ components: [{ name: 'Foo', child: 'Bar', mount: el, data: { wat: 'Wat' } }] });
    assertElementShape(first, 'div', { 'data-bar': 'Bar' }, 'Hello World');
  }

  @test({ kind: 'glimmer' })
  'recursive component invocation'() {
    let counter = 0;

    class RecursiveInvoker extends GlimmerishComponent {
      id: number;

      get showChildren() {
        return this.id < 3;
      }

      constructor(owner: Owner, args: Dict) {
        super(owner, args);
        this.id = ++counter;
      }
    }

    this.registerComponent(
      'Glimmer',
      'RecursiveInvoker',
      '{{id}}{{#if showChildren}}<RecursiveInvoker />{{/if}}',
      RecursiveInvoker
    );

    this.render('<RecursiveInvoker />');
    this.assertHTML('123<!---->');
  }

  @test({ kind: 'templateOnly' })
  'throwing an error during component construction does not put result into a bad state'() {
    this.registerComponent(
      'Glimmer',
      'Foo',
      'Hello',
      class extends GlimmerishComponent {
        constructor(owner: Owner, args: Dict) {
          super(owner, args);
          throw new Error('something went wrong!');
        }
      }
    );

    this.render('{{#if showing}}<Foo/>{{/if}}', {
      showing: false,
    });

    this.assert.throws(() => {
      this.rerender({ showing: true });
    }, 'something went wrong!');

    this.assertHTML('<!---->', 'values rendered before the error rendered correctly');
    this.destroy();

    this.assertHTML('', 'destroys correctly');
  }

  @test({ kind: 'templateOnly' })
  'throwing an error during component construction does not put result into a bad state with multiple prior nodes'() {
    this.registerComponent(
      'Glimmer',
      'Foo',
      'Hello',
      class extends GlimmerishComponent {
        constructor(owner: Owner, args: Dict) {
          super(owner, args);
          throw new Error('something went wrong!');
        }
      }
    );

    this.render('{{#if showing}}<div class="first"></div><div class="second"></div><Foo/>{{/if}}', {
      showing: false,
    });

    this.assert.throws(() => {
      this.rerender({ showing: true });
    }, 'something went wrong!');

    this.assertHTML(
      '<div class="first"></div><div class="second"></div><!---->',
      'values rendered before the error rendered correctly'
    );
    this.destroy();

    this.assertHTML('', 'destroys correctly');
  }

  @test({ kind: 'templateOnly' })
  'throwing an error during component construction does not put result into a bad state with nested components'() {
    this.registerComponent(
      'Glimmer',
      'Foo',
      'Hello',
      class extends GlimmerishComponent {
        constructor(owner: Owner, args: Dict) {
          super(owner, args);
          throw new Error('something went wrong!');
        }
      }
    );

    this.registerComponent('TemplateOnly', 'Bar', '<div class="second"></div><Foo/>');

    this.render('{{#if showing}}<div class="first"></div><Bar/>{{/if}}', {
      showing: false,
    });

    this.assert.throws(() => {
      this.rerender({ showing: true });
    }, 'something went wrong!');

    this.assertHTML(
      '<div class="first"></div><div class="second"></div><!---->',
      'values rendered before the error rendered correctly'
    );
    this.destroy();

    this.assertHTML('', 'destroys correctly');
  }

  @test({ kind: 'templateOnly' })
  'throwing an error during rendering gives a readable error stack'(assert: Assert) {
    // eslint-disable-next-line no-console
    let originalConsoleError = console.error;

    // eslint-disable-next-line no-console
    console.error = (message: string) => {
      this.assert.ok(
        message.match(/Error occurred:\n\n(- While rendering:\nBar\n {2}Foo)?/),
        'message logged'
      );
    };

    try {
      assert.expect(7);

      this.registerComponent(
        'Glimmer',
        'Foo',
        'Hello',
        class extends GlimmerishComponent {
          constructor(owner: Owner, args: Dict) {
            super(owner, args);
            throw new Error('something went wrong!');
          }
        }
      );

      this.registerComponent('TemplateOnly', 'Bar', '<div class="second"></div><Foo/>');

      this.render('{{#if showing}}<div class="first"></div><Bar/>{{/if}}', {
        showing: false,
      });

      this.assert.throws(() => {
        this.rerender({ showing: true });
      }, /something went wrong!/);

      this.assertHTML(
        '<div class="first"></div><div class="second"></div><!---->',
        'values rendered before the error rendered correctly'
      );
      this.destroy();

      this.assertHTML('', 'destroys correctly');
    } finally {
      // eslint-disable-next-line no-console
      console.error = originalConsoleError;
    }
  }
}
