import { module, AbstractRenderTest, test } from '@glimmer/test-helpers';

class YieldTests extends AbstractRenderTest {
  @test
  'yield'() {
    this.render(
      {
        layout: '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}',
        args: { predicate: 'activated', someValue: '42' },
        blockParams: ['result'],
        template: 'Hello{{result}}{{outer}}',
        inverse: 'Goodbye{{outer}}'
      },
      { activated: true, outer: 'outer' }
    );

    this.assertComponent('Yes:Hello42outer');
    this.assertStableRerender();
  }

  @test({
    skip: 'glimmer'
  })
  'yield to inverse'() {
    this.render(
      {
        layout: '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}',
        args: { predicate: 'activated', someValue: '42' },
        blockParams: ['result'],
        template: 'Hello{{result}}{{outer}}',
        inverse: 'Goodbye{{outer}}'
      },
      { activated: false, outer: "outer" }
    );

    this.assertComponent('No:Goodbyeouter');
    this.assertStableRerender();
  }

  @test
  'yielding to an non-existent block'() {
    this.render({
      layout: 'Before-{{yield}}-After'
    });

    this.assertComponent('Before--After');
    this.assertStableRerender();
  }

  @test
  'yielding a string and rendering its length'() {
    this.render({
      layout: `{{yield "foo"}}-{{yield ""}}`,
      blockParams: ['yielded'],
      template: '{{yielded}}-{{yielded.length}}'
    });

    this.assertComponent(`foo-3--0`);
    this.assertStableRerender();
  }

  @test({
    skip: 'glimmer'
  })
  'use a non-existent block param'() {
    this.render({
      layout: '{{yield someValue}}',
      args: { someValue: '42' },
      blockParams: ['val1', 'val2'],
      template: '{{val1}} - {{val2}}'
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
  "yielding primatives"() {
    [
      {
        value: 'true',
        output: 'true'
      }, {
        value: 'false',
        output: 'false'
      }, {
        value: 'null',
        output: ''
      }, {
        value: 'undefined',
        output: ''
      }, {
        value: '1',
        output: '1'
      }, {
        value: '"foo"',
        output: 'foo'
      }
    ].forEach(({ value, output }) => {
      this.render({
        layout: `{{yield ${value}}}`,
        blockParams: ['yielded'],
        template: '{{yielded}}-{{yielded.foo.bar}}'
      });

      this.assertComponent(`${output}-`);
      this.assertStableRerender();
    });
  }

  @test
  "yield inside a conditional on the component"() {
    this.render({
      layout: 'In layout -- {{#if @predicate}}{{yield}}{{/if}}',
      template: 'In template',
      args: { predicate: 'predicate' }
    }, { predicate: true });

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

module('Component Yielding', YieldTests, { componentModule: true });
