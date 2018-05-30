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
    kind: 'basic',
  })
  'rwjblue invoking dynamic component (named arg) via angle brackets'() {
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
    kind: 'basic',
  })
  'rwjblue invoking dynamic component (named arg) via angle brackets supports attributes'() {
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
    kind: 'basic',
  })
  'rwjblue invoking dynamic component (named arg) via angle brackets supports args'() {
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
    kind: 'basic',
  })
  'rwjblue invoking dynamic component (named arg) via angle brackets supports passing a block'() {
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
    kind: 'basic',
  })
  'rwjblue invoking dynamic component (named arg) via angle brackets supports args and attributes'() {
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
    kind: 'basic',
  })
  'rwjblue invoking dynamic component (local) via angle brackets'() {
    this.registerComponent('Glimmer', 'Foo', 'hello world!');
    this.render(`{{#with (component 'Foo') as |Other|}}<Other />{{/with}}`);

    this.assertHTML(`hello world!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'basic',
  })
  'rwjblue invoking dynamic component (local) via angle brackets (ill-advised "htmlish element name" but supported)'() {
    this.registerComponent('Glimmer', 'Foo', 'hello world!');
    this.render(`{{#with (component 'Foo') as |div|}}<div />{{/with}}`);

    this.assertHTML(`hello world!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'basic',
  })
  'rwjblue invoking dynamic component (local) via angle brackets supports attributes'() {
    this.registerComponent('Glimmer', 'Foo', '<div ...attributes>hello world!</div>');
    this.render(`{{#with (component 'Foo') as |Other|}}<Other data-test="foo" />{{/with}}`);

    this.assertHTML(`<div data-test="foo">hello world!</div>`);
    this.assertStableRerender();
  }

  @test({
    kind: 'basic',
  })
  'rwjblue invoking dynamic component (local) via angle brackets supports args'() {
    this.registerComponent('Glimmer', 'Foo', 'hello {{@name}}!');
    this.render(`{{#with (component 'Foo') as |Other|}}<Other @name="world" />{{/with}}`);

    this.assertHTML(`hello world!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'basic',
  })
  'rwjblue invoking dynamic component (local) via angle brackets supports passing a block'() {
    this.registerComponent('Glimmer', 'Foo', 'hello {{yield}}!');
    this.render(`{{#with (component 'Foo') as |Other|}}<Other>world</Other>{{/with}}`);

    this.assertHTML(`hello world!`);
    this.assertStableRerender();
  }

  @test({
    kind: 'basic',
  })
  'rwjblue invoking dynamic component (local) via angle brackets supports args, attributes, and blocks'() {
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
  }
}
