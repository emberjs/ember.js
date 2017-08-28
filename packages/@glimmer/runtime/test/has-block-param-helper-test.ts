import { AbstractRenderTest, module, test } from '@glimmer/test-helpers';

class HasBlockParamHelperTests extends AbstractRenderTest {
  @test({ kind: 'curly' })
  "parameterized has-block-params (subexpr, inverse) when inverse supplied without block params"() {
    this.render({
      layout: '{{#if (has-block-params "inverse")}}Yes{{else}}No{{/if}}',
      template: 'block here',
      inverse: 'inverse here'
    });

    this.assertComponent('No');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (subexpr, inverse) when inverse not supplied"() {
    this.render({
      layout: '{{#if (has-block-params "inverse")}}Yes{{else}}No{{/if}}',
      template: 'block here',
    });

    this.assertComponent('No');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (subexpr, default) when block supplied with block params"() {
    this.render({
      layout: '{{#if (has-block-params)}}Yes{{else}}No{{/if}}',
      blockParams: ['param'],
      template: 'block here'
    });

    this.assertComponent('Yes');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (subexpr, default) when block supplied without block params"() {
    this.render({
      layout: '{{#if (has-block-params)}}Yes{{else}}No{{/if}}',
      template: 'block here'
    });

    this.assertComponent('No');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (subexpr, default) when block not supplied"() {
    this.render({
      layout: '{{#if (has-block-params)}}Yes{{else}}No{{/if}}',
    });

    this.assertComponent('No');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (content, inverse) when inverse supplied without block params"() {
    this.render({
      layout: '{{has-block-params "inverse"}}',
      template: 'block here',
      inverse: 'inverse here'
    });

    this.assertComponent('false');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (content, inverse) when inverse not supplied"() {
    this.render({
      layout: '{{has-block-params "inverse"}}',
      template: 'block here'
    });

    this.assertComponent('false');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (content, default) when block supplied with block params"() {
    this.render({
      layout: '{{has-block-params}}',
      blockParams: ['param'],
      template: 'block here'
    });

    this.assertComponent('true');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (content, default) when block supplied without block params"() {
    this.render({
      layout: '{{has-block-params}}',
      template: 'block here'
    });

    this.assertComponent('false');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (content, default) when block not supplied"() {
    this.render({
      layout: '{{has-block-params}}',
      template: 'block here'
    });

    this.assertComponent('false');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (prop, inverse) when inverse supplied without block params"() {
    this.render({
      layout: '<button name={{has-block-params "inverse"}}></button>',
      template: 'block here',
      inverse: 'inverse here'
    });

    this.assertComponent('<button name="false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (prop, inverse) when inverse not supplied"() {
    this.render({
      layout: '<button name={{has-block-params "inverse"}}></button>',
      template: 'block here'
    });

    this.assertComponent('<button name="false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (prop, default) when block supplied with block params"() {
    this.render({
      layout: '<button name={{has-block-params}}></button>',
      blockParams: ['param'],
      template: 'block here'
    });

    this.assertComponent('<button name="true"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (prop, default) when block supplied without block params"() {
    this.render({
      layout: '<button name={{has-block-params}}></button>',
      template: 'block here'
    });

    this.assertComponent('<button name="false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (prop, default) when block not supplied"() {
    this.render({
      layout: '<button name={{has-block-params}}></button>',
    });

    this.assertComponent('<button name="false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (attr, inverse) when inverse supplied without block params"() {
    this.render({
      layout: '<button data-has-block-params="{{has-block-params "inverse"}}"></button>',
      template: 'block here',
      inverse: 'inverse here'
    });

    this.assertComponent('<button data-has-block-params="false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (attr, inverse) when inverse not supplied"() {
    this.render({
      layout: '<button data-has-block-params="{{has-block-params "inverse"}}"></button>',
      template: 'block here',
      inverse: 'inverse here'
    });

    this.assertComponent('<button data-has-block-params="false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (attr, default) when block supplied with block params"() {
    this.render({
      layout: '<button data-has-block-params="{{has-block-params}}"></button>',
      blockParams: ['param'],
      template: 'block here'
    });

    this.assertComponent('<button data-has-block-params="true"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (attr, default) when block supplied without block params"() {
    this.render({
      layout: '<button data-has-block-params="{{has-block-params}}"></button>',
      template: 'block here'
    });

    this.assertComponent('<button data-has-block-params="false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (attr, default) when block not supplied"() {
    this.render({
      layout: '<button data-has-block-params="{{has-block-params}}"></button>',
      template: 'block here'
    });

    this.assertComponent('<button data-has-block-params="false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (concatted attr, inverse) when inverse supplied without block params"() {
    this.render({
      layout: '<button data-has-block-params="is-{{has-block-params "inverse"}}"></button>',
      template: 'block here',
      inverse: 'inverse here'
    });

    this.assertComponent('<button data-has-block-params="is-false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (concatted attr, inverse) when inverse not supplied"() {
    this.render({
      layout: '<button data-has-block-params="is-{{has-block-params "inverse"}}"></button>',
      template: 'block here'
    });

    this.assertComponent('<button data-has-block-params="is-false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (concatted attr, default) when block supplied with block params"() {
    this.render({
      layout: '<button data-has-block-params="is-{{has-block-params}}"></button>',
      template: 'block here',
      blockParams: ['param']
    });

    this.assertComponent('<button data-has-block-params="is-true"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (concatted attr, default) when block supplied without block params"() {
    this.render({
      layout: '<button data-has-block-params="is-{{has-block-params}}"></button>',
      template: 'block here'
    });

    this.assertComponent('<button data-has-block-params="is-false"></button>');
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  "parameterized has-block-params (concatted attr, default) when block not supplied"() {
    this.render({
      layout: '<button data-has-block-params="is-{{has-block-params}}"></button>'
    });

    this.assertComponent('<button data-has-block-params="is-false"></button>');
    this.assertStableRerender();
  }
}

module('Components - has-block-params helper', HasBlockParamHelperTests, { componentModule: true });
