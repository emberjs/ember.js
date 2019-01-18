import { RenderTest, test } from '../render-test';
import { stripTight, EmberishGlimmerComponent } from '../../index';

export class FragmentComponents extends RenderTest {
  @test({
    kind: 'fragment',
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
    kind: 'fragment',
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

export class BasicComponents extends RenderTest {
  @test({
    kind: 'basic',
  })
  'creating a new component'() {
    this.render(
      {
        name: 'MyComponent',
        layout: '{{yield}}',
        template: 'hello!',
        attributes: { color: '{{color}}' },
      },
      { color: 'red' }
    );

    this.assertHTML(`<div color='red'>hello!</div>`);
    this.assertStableRerender();

    this.rerender({ color: 'green' });
    this.assertHTML(`<div color='green'>hello!</div>`);
    this.assertStableNodes();

    this.rerender({ color: 'red' });
    this.assertHTML(`<div color='red'>hello!</div>`);
    this.assertStableNodes();
  }

  @test({
    kind: 'basic',
  })
  'creating a new component passing args'() {
    this.render(
      {
        name: 'MyComponent',
        layout: '{{@arg1}}{{yield}}',
        template: 'hello!',
        args: { arg1: "'hello - '" },
        attributes: { color: '{{color}}' },
      },
      { color: 'red' }
    );

    this.assertHTML("<div color='red'>hello - hello!</div>");
    this.assertStableRerender();

    this.rerender({ color: 'green' });
    this.assertHTML("<div color='green'>hello - hello!</div>");
    this.assertStableNodes();

    this.rerender({ color: 'red' });
    this.assertHTML("<div color='red'>hello - hello!</div>");
    this.assertStableNodes();
  }

  @test({
    kind: 'basic',
  })
  'creating a new component passing dynamic args'() {
    this.render(
      {
        name: 'MyComponent',
        layout: '{{@arg1}}{{yield}}',
        template: 'hello!',
        args: { arg1: 'left' },
        attributes: { color: '{{color}}' },
      },
      { color: 'red', left: 'left - ' }
    );

    this.assertHTML("<div color='red'>left - hello!</div>");
    this.assertStableRerender();

    this.rerender({ color: 'green', left: 'LEFT - ' });
    this.assertHTML("<div color='green'>LEFT - hello!</div>");
    this.assertStableNodes();

    this.rerender({ color: 'red', left: 'left - ' });
    this.assertHTML("<div color='red'>left - hello!</div>");
    this.assertStableNodes();
  }

  @test({
    kind: 'fragment',
  })
  'invoke a component forwarding attributes'() {
    this.registerComponent(
      'Glimmer',
      'InnerComponent',
      '<p data-foo="definition" data-bar="definition" ...attributes>Inner Component</p>'
    );
    this.render(
      {
        layout:
          '{{#with (component "InnerComponent") as |Inner|}}<Inner data-foo="invocation" ...attributes />{{/with}}',
        attributes: { title: 'Emberconf' },
      },
      {}
    );
    this.assertHTML(
      "<p data-foo='invocation' data-bar='definition' title='Emberconf'>Inner Component</p>"
    );
    this.assertStableRerender();
  }

  @test({
    kind: 'basic',
  })
  'creating a new component yielding values'() {
    this.render(
      {
        name: 'MyComponent',
        layout: '{{@arg1}}{{yield @yieldme}}',
        template: 'hello! {{yielded}}',
        blockParams: ['yielded'],
        args: { arg1: 'left', yieldme: "'yield me'" },
        attributes: { color: '{{color}}' },
      },
      { color: 'red', left: 'left - ' }
    );

    this.assertHTML("<div color='red'>left - hello! yield me</div>");
    this.assertStableRerender();

    this.rerender({ color: 'green', left: 'LEFT - ' });
    this.assertHTML("<div color='green'>LEFT - hello! yield me</div>");
    this.assertStableNodes();

    this.rerender({ color: 'red', left: 'left - ' });
    this.assertHTML("<div color='red'>left - hello! yield me</div>");
    this.assertStableNodes();
  }

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
    class Foo extends EmberishGlimmerComponent {
      public localProperty: string;

      constructor() {
        super();
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
    instance!.recompute();
    this.rerender();
    this.assertHTML(
      `<div><div data-test1="OUTER" data-test2="static">[LOCAL static OUTER]</div></div>`
    );

    instance!.localProperty = 'local';
    instance!.recompute();
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
    class Foo extends EmberishGlimmerComponent {
      public localProperty: string;

      constructor() {
        super();
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
    instance!.recompute();
    this.rerender();
    this.assertHTML(
      `<div data-test1="OUTER" data-test2="static">[LOCAL static OUTER] - template</div>`
    );

    instance!.localProperty = 'local';
    instance!.recompute();
    this.rerender({ outer: 'outer' });
    this.assertHTML(
      `<div data-test1="outer" data-test2="static">[local static outer] - template</div>`
    );
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (path) via angle brackets'() {
    class TestHarness extends EmberishGlimmerComponent {
      public Foo: any;

      constructor(args: any) {
        super();
        this.Foo = args.attrs.Foo;
      }
    }
    this.registerComponent('Glimmer', 'TestHarness', '<this.Foo />', TestHarness);
    this.registerComponent('Glimmer', 'Foo', 'hello world!');

    this.render('<TestHarness @Foo={{component "Foo"}} />');

    this.assertHTML(`hello world!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (path) via angle brackets does not support implicit `this` fallback'() {
    class TestHarness extends EmberishGlimmerComponent {
      public stuff: any;

      constructor(args: any) {
        super();
        this.stuff = {
          Foo: args.attrs.Foo,
        };
      }
    }
    this.registerComponent('Glimmer', 'TestHarness', '<stuff.Foo />', TestHarness);
    this.registerComponent(
      'Glimmer',
      'Foo',
      'hello world!',
      class extends EmberishGlimmerComponent {
        constructor() {
          super(...arguments);
          throw new Error('Should not have instantiated Foo component.');
        }
      }
    );

    this.render('<TestHarness @Foo={{component "Foo"}} />');
    this.assertStableRerender();
  }

  @test({
    kind: 'glimmer',
  })
  'invoking dynamic component (path) via angle brackets supports attributes'() {
    class TestHarness extends EmberishGlimmerComponent {
      public Foo: any;

      constructor(args: any) {
        super();
        this.Foo = args.attrs.Foo;
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
    class TestHarness extends EmberishGlimmerComponent {
      public Foo: any;

      constructor(args: any) {
        super();
        this.Foo = args.attrs.Foo;
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
    class TestHarness extends EmberishGlimmerComponent {
      public Foo: any;

      constructor(args: any) {
        super();
        this.Foo = args.attrs.Foo;
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
    class TestHarness extends EmberishGlimmerComponent {
      public Foo: any;

      constructor(args: any) {
        super();
        this.Foo = args.attrs.Foo;
      }
    }
    class Foo extends EmberishGlimmerComponent {
      public localProperty: string;

      constructor() {
        super();
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
    instance!.recompute();
    this.rerender();
    this.assertHTML(
      `<div data-test1="OUTER" data-test2="static">[LOCAL static OUTER] - template</div>`
    );

    instance!.localProperty = 'local';
    instance!.recompute();
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
}
