import { module, RenderTests, test } from "@glimmer/test-helpers";

class HasBlockHelperTests extends RenderTests {
  @test({ kind: 'curly' })
  "parameterized has-block (subexpr, inverse) when inverse supplied"() {
    this.render({
      layout: '{{#if (has-block "inverse")}}Yes{{else}}No{{/if}}',
      template: 'block here',
      inverse: 'inverse here'
    });

    this.assertComponent('Yes');
    this.assertStableRerender();
  }

  @test
  "parameterized has-block (subexpr, inverse) when inverse not supplied"() {
    this.render({
      layout: '{{#if (has-block "inverse")}}Yes{{else}}No{{/if}}',
      template: 'block here'
    });

    this.assertComponent('No');
    this.assertStableRerender();
  }

  @test
  "parameterized has-block (subexpr, default) when block supplied"() {
    this.render({
      layout: '{{#if (has-block)}}Yes{{else}}No{{/if}}',
      template: 'block here'
    });

    this.assertComponent('Yes');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block (subexpr, default) when block not supplied"() {
    this.render({
      layout: '{{#if (has-block)}}Yes{{else}}No{{/if}}',
    });

    this.assertComponent('No');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block (content, inverse) when inverse supplied"() {
    this.render({
      layout: '{{has-block "inverse"}}',
      template: 'block here',
      inverse: 'inverse here'
    });

    this.assertComponent('true');
    this.assertStableRerender();
  }

  @test
  "parameterized has-block (content, inverse) when inverse not supplied"() {
    this.render({
      layout: '{{has-block "inverse"}}',
      template: 'block here'
    });

    this.assertComponent('false');
    this.assertStableRerender();
  }

  @test
  "parameterized has-block (content, default) when block supplied"() {
    this.render({
      layout: '{{has-block}}',
      template: 'block here'
    });

    this.assertComponent('true');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block (content, default) when block not supplied"() {
    this.render({
      layout: '{{has-block}}'
    });

    this.assertComponent('false');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block (prop, inverse) when inverse supplied"() {
    this.render({
      layout: '<button name={{has-block "inverse"}}></button>',
      template: 'block here',
      inverse: 'inverse here'
    });

    this.assertComponent('<button name="true"></button>');
    this.assertStableRerender();
  }

  @test
  "parameterized has-block (prop, inverse) when inverse not supplied"() {
    this.render({
      layout: '<button name={{has-block "inverse"}}></button>',
      template: 'block here'
    });

    this.assertComponent('<button name="false"></button>');
    this.assertStableRerender();
  }

  @test
  "parameterized has-block (prop, default) when block supplied"() {
    this.render({
      layout: '<button name={{has-block}}></button>',
      template: 'block here'
    });

    this.assertComponent('<button name="true"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block (prop, default) when block not supplied"() {
    this.render({
      layout: '<button name={{has-block}}></button>',
    });

    this.assertComponent('<button name="false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block (attr, inverse) when inverse supplied"() {
    this.render({
      layout: '<button data-has-block="{{has-block "inverse"}}"></button>',
      template: 'block here',
      inverse: 'inverse here'
    });

    this.assertComponent('<button data-has-block="true"></button>');
    this.assertStableRerender();
  }

  @test
  "parameterized has-block (attr, inverse) when inverse not supplied"() {
    this.render({
      layout: '<button data-has-block="{{has-block "inverse"}}"></button>',
      template: 'block here'
    });

    this.assertComponent('<button data-has-block="false"></button>');
    this.assertStableRerender();
  }

  @test
  "parameterized has-block (attr, default) when block supplied"() {
    this.render({
      layout: '<button data-has-block="{{has-block}}"></button>',
      template: 'block here'
    });

    this.assertComponent('<button data-has-block="true"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block (attr, default) when block not supplied"() {
    this.render({
      layout: '<button data-has-block="{{has-block}}"></button>',
    });

    this.assertComponent('<button data-has-block="false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block (concatted attr, inverse) when inverse supplied"() {
    this.render({
      layout: '<button data-has-block="is-{{has-block "inverse"}}"></button>',
      template: 'block here',
      inverse: 'inverse here'
    });

    this.assertComponent('<button data-has-block="is-true"></button>');
    this.assertStableRerender();
  }

  @test
  "parameterized has-block (concatted attr, inverse) when inverse not supplied"() {
    this.render({
      layout: '<button data-has-block="is-{{has-block "inverse"}}"></button>',
      template: 'block here'
    });

    this.assertComponent('<button data-has-block="is-false"></button>');
    this.assertStableRerender();
  }

  @test
  "parameterized has-block (concatted attr, default) when block supplied"() {
    this.render({
      layout: '<button data-has-block="is-{{has-block}}"></button>',
      template: 'block here'
    });

    this.assertComponent('<button data-has-block="is-true"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block (concatted attr, default) when block not supplied"() {
    this.render({
      layout: '<button data-has-block="is-{{has-block}}"></button>',
    });

    this.assertComponent('<button data-has-block="is-false"></button>');
    this.assertStableRerender();
  }
}

module('Has Block Helper', HasBlockHelperTests, { componentModule: true });
