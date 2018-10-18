import { RenderTest, test } from '../render-test';

export class HasBlockSuite extends RenderTest {
  @test({ kind: 'curly' })
  'parameterized has-block (subexpr, else) when else supplied'() {
    this.render({
      layout: '{{#if (has-block "inverse")}}Yes{{else}}No{{/if}}',
      template: 'block here',
      else: 'else here',
    });

    this.assertComponent('Yes');
    this.assertStableRerender();
  }

  @test
  'parameterized has-block (subexpr, else) when else not supplied'() {
    this.render({
      layout: '{{#if (has-block "inverse")}}Yes{{else}}No{{/if}}',
      template: 'block here',
    });

    this.assertComponent('No');
    this.assertStableRerender();
  }

  @test
  'parameterized has-block (subexpr, default) when block supplied'() {
    this.render({
      layout: '{{#if (has-block)}}Yes{{else}}No{{/if}}',
      template: 'block here',
    });

    this.assertComponent('Yes');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  'parameterized has-block (subexpr, default) when block not supplied'() {
    this.render({
      layout: '{{#if (has-block)}}Yes{{else}}No{{/if}}',
    });

    this.assertComponent('No');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  'parameterized has-block (content, else) when else supplied'() {
    this.render({
      layout: '{{has-block "inverse"}}',
      template: 'block here',
      else: 'else here',
    });

    this.assertComponent('true');
    this.assertStableRerender();
  }

  @test
  'parameterized has-block (content, else) when else not supplied'() {
    this.render({
      layout: '{{has-block "inverse"}}',
      template: 'block here',
    });

    this.assertComponent('false');
    this.assertStableRerender();
  }

  @test
  'parameterized has-block (content, default) when block supplied'() {
    this.render({
      layout: '{{has-block}}',
      template: 'block here',
    });

    this.assertComponent('true');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  'parameterized has-block (content, default) when block not supplied'() {
    this.render({
      layout: '{{has-block}}',
    });

    this.assertComponent('false');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  'parameterized has-block (prop, else) when else supplied'() {
    this.render({
      layout: '<button name={{has-block "inverse"}}></button>',
      template: 'block here',
      else: 'else here',
    });

    this.assertComponent('<button name="true"></button>');
    this.assertStableRerender();
  }

  @test
  'parameterized has-block (prop, else) when else not supplied'() {
    this.render({
      layout: '<button name={{has-block "inverse"}}></button>',
      template: 'block here',
    });

    this.assertComponent('<button name="false"></button>');
    this.assertStableRerender();
  }

  @test
  'parameterized has-block (prop, default) when block supplied'() {
    this.render({
      layout: '<button name={{has-block}}></button>',
      template: 'block here',
    });

    this.assertComponent('<button name="true"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  'parameterized has-block (prop, default) when block not supplied'() {
    this.render({
      layout: '<button name={{has-block}}></button>',
    });

    this.assertComponent('<button name="false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  'parameterized has-block (attr, else) when else supplied'() {
    this.render({
      layout: '<button data-has-block="{{has-block "inverse"}}"></button>',
      template: 'block here',
      else: 'else here',
    });

    this.assertComponent('<button data-has-block="true"></button>');
    this.assertStableRerender();
  }

  @test
  'parameterized has-block (attr, else) when else not supplied'() {
    this.render({
      layout: '<button data-has-block="{{has-block "inverse"}}"></button>',
      template: 'block here',
    });

    this.assertComponent('<button data-has-block="false"></button>');
    this.assertStableRerender();
  }

  @test
  'parameterized has-block (attr, default) when block supplied'() {
    this.render({
      layout: '<button data-has-block="{{has-block}}"></button>',
      template: 'block here',
    });

    this.assertComponent('<button data-has-block="true"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  'parameterized has-block (attr, default) when block not supplied'() {
    this.render({
      layout: '<button data-has-block="{{has-block}}"></button>',
    });

    this.assertComponent('<button data-has-block="false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  'parameterized has-block (concatted attr, else) when else supplied'() {
    this.render({
      layout: '<button data-has-block="is-{{has-block "inverse"}}"></button>',
      template: 'block here',
      else: 'else here',
    });

    this.assertComponent('<button data-has-block="is-true"></button>');
    this.assertStableRerender();
  }

  @test
  'parameterized has-block (concatted attr, else) when else not supplied'() {
    this.render({
      layout: '<button data-has-block="is-{{has-block "inverse"}}"></button>',
      template: 'block here',
    });

    this.assertComponent('<button data-has-block="is-false"></button>');
    this.assertStableRerender();
  }

  @test
  'parameterized has-block (concatted attr, default) when block supplied'() {
    this.render({
      layout: '<button data-has-block="is-{{has-block}}"></button>',
      template: 'block here',
    });

    this.assertComponent('<button data-has-block="is-true"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  'parameterized has-block (concatted attr, default) when block not supplied'() {
    this.render({
      layout: '<button data-has-block="is-{{has-block}}"></button>',
    });

    this.assertComponent('<button data-has-block="is-false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'glimmer' })
  'self closing angle bracket invocation (subexpr, default)'() {
    this.registerComponent(
      'Glimmer',
      'TestComponent',
      `<div ...attributes>{{#if (has-block)}}Yes{{else}}No{{/if}}</div>`
    );
    this.render(`<TestComponent />`);

    this.assertComponent('No');
    this.assertStableRerender();
  }

  @test({ kind: 'glimmer' })
  'self closing angle bracket invocation (subexpr, else)'() {
    this.registerComponent(
      'Glimmer',
      'TestComponent',
      `<div ...attributes>{{#if (has-block 'inverse')}}Yes{{else}}No{{/if}}</div>`
    );
    this.render(`<TestComponent />`);

    this.assertComponent('No');
    this.assertStableRerender();
  }

  @test({ kind: 'glimmer' })
  'self closing angle bracket invocation (concatted attr, default)'() {
    this.registerComponent(
      'Glimmer',
      'TestComponent',
      `<div data-has-block="{{has-block}}" ...attributes></div>`
    );
    this.render(`<TestComponent />`);

    this.assertComponent('', { 'data-has-block': 'false' });
    this.assertStableRerender();
  }
}
