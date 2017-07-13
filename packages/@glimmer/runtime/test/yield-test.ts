import { module, RenderTests, test } from "@glimmer/test-helpers";

class YieldTests extends RenderTests {
  @test
  "yielding to an non-existent block"() {
    this.render({
      layout: "Before-{{yield}}-After"
    });

    this.assertComponent("Before--After");
    this.assertStableRerender();
  }

  @test
  yield() {
    this.render(
      {
        layout: '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}',
        args: { predicate: "activated", someValue: "42" },
        blockParams: ["result"],
        template: "Hello{{result}}{{outer}}",
        inverse: "Goodbye{{outer}}"
      },
      { activated: true, outer: "outer" }
    );

    this.assertComponent("Yes:Hello42outer");
    this.assertStableRerender();
  }
  /*
testComponent('yield', {
  layout: '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}',

  invokeAs: {
    args: { predicate: 'activated', someValue: '42' },
    context: { activated: true, outer: "outer" },
    blockParams: ['result'],
    template: 'Hello{{result}}{{outer}}',
    inverse: 'Goodbye{{outer}}'
  },

  expected: 'Yes:Hello42outer'
});

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
  testComponent(`yielding ${value}`, {
    layout: `{{yield ${value}}}`,

    invokeAs: {
      blockParams: ['yielded'],
      template: '{{yielded}}-{{yielded.foo.bar}}'
    },

    expected: `${output}-`
  });
});

testComponent(`yielding a string and rendering its length`, {
  layout: `{{yield "foo"}}-{{yield ""}}`,

  invokeAs: {
    blockParams: ['yielded'],
    template: '{{yielded}}-{{yielded.length}}'
  },

  expected: `foo-3--0`
});

testComponent('use a non-existent block param', {
  skip: 'glimmer',
  layout: '{{yield someValue}}',

  invokeAs: {
    args: { someValue: '42' },
    blockParams: ['val1', 'val2'],
    template: '{{val1}} - {{val2}}'
  },

  expected: '42 - '
});

testComponent('yield to inverse', {
  skip: 'glimmer',
  layout: '{{#if @predicate}}Yes:{{yield @someValue}}{{else}}No:{{yield to="inverse"}}{{/if}}',

  invokeAs: {
    args: { predicate: 'activated', someValue: '42' },
    context: { activated: false, outer: "outer" },
    blockParams: ['result'],
    template: 'Hello{{result}}{{outer}}',
    inverse: 'Goodbye{{outer}}'
  },

  expected: 'No:Goodbyeouter'
});

testComponent('block without properties', {
  layout: 'In layout -- {{yield}}',
  invokeAs: { template: 'In template' },
  expected: 'In layout -- In template'
});

testComponent('yield inside a conditional on the component', {
  layout: 'In layout -- {{#if @predicate}}{{yield}}{{/if}}',
  invokeAs: {
    template: 'In template',
    args: { predicate: 'predicate' },
    context: { predicate: true }
  },
  expected: {
    attrs: {},
    content: 'In layout -- In template'
  },
  updates: [{
    expected: 'In layout -- In template'
  }, {
    context: { predicate: false },
    expected: 'In layout -- <!---->'
  }, {
    context: { predicate: true },
    expected: 'In layout -- In template'
  }]
});*/
}

module("Component Yielding", YieldTests, { componentModule: true });
