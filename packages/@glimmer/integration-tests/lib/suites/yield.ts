import { RenderTest } from '../render-test';
import { test } from '../test-decorator';

export class YieldSuite extends RenderTest {
  static suiteName = 'yield';

  @test
  yield() {
    this.render(
      {
        layout:
          '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}',
        args: { predicate: 'activated', someValue: '42' },
        blockParams: ['result'],
        template: 'Hello{{result}}{{outer}}',
        else: 'Goodbye{{outer}}',
      },
      { activated: true, outer: 'outer' }
    );

    this.assertComponent('Yes:Hello42outer');
    this.assertStableRerender();
  }

  @test({
    skip: 'glimmer',
  })
  [`yield to "inverse"`]() {
    this.render(
      {
        layout:
          '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}',
        args: { predicate: 'activated', someValue: '42' },
        blockParams: ['result'],
        template: 'Hello{{result}}{{outer}}',
        else: 'Goodbye{{outer}}',
      },
      { activated: false, outer: 'outer' }
    );

    this.assertComponent('No:Goodbyeouter');
    this.assertStableRerender();
  }

  @test({
    skip: 'glimmer',
  })
  [`yield to "else"`]() {
    this.render(
      {
        layout: '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="else"}}{{/if}}',
        args: { predicate: 'activated', someValue: '42' },
        blockParams: ['result'],
        template: 'Hello{{result}}{{outer}}',
        else: 'Goodbye{{outer}}',
      },
      { activated: false, outer: 'outer' }
    );

    this.assertComponent('No:Goodbyeouter');
    this.assertStableRerender();
  }

  @test
  'yielding to an non-existent block'() {
    this.render({
      layout: 'Before-{{yield}}-After',
    });

    this.assertComponent('Before--After');
    this.assertStableRerender();
  }

  @test
  'yielding a string and rendering its length'() {
    this.render({
      layout: `{{yield "foo"}}-{{yield ""}}`,
      blockParams: ['yielded'],
      template: '{{yielded}}-{{yielded.length}}',
    });

    this.assertComponent(`foo-3--0`);
    this.assertStableRerender();
  }

  @test({
    skip: 'glimmer',
  })
  'use a non-existent block param'() {
    this.render({
      layout: '{{yield someValue}}',
      args: { someValue: '42' },
      blockParams: ['val1', 'val2'],
      template: '{{val1}} - {{val2}}',
    });

    this.assertComponent('42 - ');
    this.assertStableRerender();
  }

  @test
  'block without properties'() {
    this.render({
      layout: 'In layout -- {{yield}}',
      template: 'In template',
    });

    this.assertComponent('In layout -- In template');
    this.assertStableRerender();
  }

  @test
  'yielding true'() {
    this.render({
      layout: `{{yield true}}`,
      blockParams: ['yielded'],
      template: '{{yielded}}-{{yielded.foo.bar}}',
    });

    this.assertComponent(`true-`);
    this.assertStableRerender();
  }

  @test
  'yielding false'() {
    this.render({
      layout: `{{yield false}}`,
      blockParams: ['yielded'],
      template: '{{yielded}}-{{yielded.foo.bar}}',
    });

    this.assertComponent(`false-`);
    this.assertStableRerender();
  }

  @test
  'yielding null'() {
    this.render({
      layout: `{{yield null}}`,
      blockParams: ['yielded'],
      template: '{{yielded}}-{{yielded.foo.bar}}',
    });

    this.assertComponent(`-`);
    this.assertStableRerender();
  }

  @test
  'yielding undefined'() {
    this.render({
      layout: `{{yield undefined}}`,
      blockParams: ['yielded'],
      template: '{{yielded}}-{{yielded.foo.bar}}',
    });

    this.assertComponent(`-`);
    this.assertStableRerender();
  }

  @test
  'yielding integers'() {
    this.render({
      layout: `{{yield 123}}`,
      blockParams: ['yielded'],
      template: '{{yielded}}-{{yielded.foo.bar}}',
    });

    this.assertComponent(`123-`);
    this.assertStableRerender();
  }

  @test
  'yielding floats'() {
    this.render({
      layout: `{{yield 123.45}}`,
      blockParams: ['yielded'],
      template: '{{yielded}}-{{yielded.foo.bar}}',
    });

    this.assertComponent(`123.45-`);
    this.assertStableRerender();
  }

  @test
  'yielding strings'() {
    this.render({
      layout: `{{yield "hello"}}`,
      blockParams: ['yielded'],
      template: '{{yielded}}-{{yielded.foo.bar}}',
    });

    this.assertComponent(`hello-`);
    this.assertStableRerender();
  }

  @test
  'yield inside a conditional on the component'() {
    this.render(
      {
        layout: 'In layout -- {{#if @predicate}}{{yield}}{{/if}}',
        template: 'In template',
        args: { predicate: 'predicate' },
      },
      { predicate: true }
    );

    this.assertComponent('In layout -- In template', {});
    this.assertStableRerender();

    this.rerender({ predicate: false });
    this.assertComponent('In layout -- <!---->');
    this.assertStableNodes();

    this.rerender({ predicate: true });
    this.assertComponent('In layout -- In template');
    this.assertStableNodes();
  }
}
